import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  addToCart as addToCartRequest,
  clearCart as clearCartRequest,
  getCart,
  removeFromCart as removeFromCartRequest,
  updateCartQty,
} from "../services/api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);
const LOCAL_CART_KEY = "digitron_guest_cart";

const readLocalCart = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CART_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeLocalCart = (items) => localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
const normalizeQty = (qty) => Math.max(1, parseInt(qty, 10) || 1);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (!user) {
      setCartItems(readLocalCart());
      return;
    }
    setLoading(true);
    try {
      const data = await getCart();
      setCartItems(data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      if (!user) {
        if (active) setCartItems(readLocalCart());
        return;
      }
      setLoading(true);
      try {
        const guestCart = readLocalCart();
        if (guestCart.length > 0) {
          for (const item of guestCart) {
            await addToCartRequest(item.productId, item.quantity);
          }
          localStorage.removeItem(LOCAL_CART_KEY);
        }
        const data = await getCart();
        if (active) setCartItems(data);
      } finally {
        if (active) setLoading(false);
      }
    };
    sync();
    return () => {
      active = false;
    };
  }, [user]);

  const addToCart = useCallback(async (productId, qty = 1) => {
    const quantity = normalizeQty(qty);
    if (!user) {
      const next = readLocalCart();
      const existing = next.find((item) => item.productId === productId);
      if (existing) existing.quantity += quantity;
      else next.push({ productId, quantity, addedAt: new Date().toISOString() });
      writeLocalCart(next);
      setCartItems(next);
      return next;
    }
    const data = await addToCartRequest(productId, quantity);
    setCartItems(data);
    return data;
  }, [user]);

  const removeFromCart = useCallback(async (productId) => {
    if (!user) {
      const next = readLocalCart().filter((item) => item.productId !== productId);
      writeLocalCart(next);
      setCartItems(next);
      return next;
    }
    const data = await removeFromCartRequest(productId);
    setCartItems(data);
    return data;
  }, [user]);

  const updateQty = useCallback(async (productId, quantity) => {
    const qty = Math.max(0, parseInt(quantity, 10) || 0);
    if (!user) {
      const next = readLocalCart()
        .map((item) => item.productId === productId ? { ...item, quantity: qty } : item)
        .filter((item) => item.quantity > 0);
      writeLocalCart(next);
      setCartItems(next);
      return next;
    }
    const data = await updateCartQty(productId, qty);
    setCartItems(data);
    return data;
  }, [user]);

  const clearCart = useCallback(async () => {
    if (!user) {
      localStorage.removeItem(LOCAL_CART_KEY);
      setCartItems([]);
      return [];
    }
    const data = await clearCartRequest();
    setCartItems(data);
    return data;
  }, [user]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 0), 0),
    [cartItems]
  );

  const value = useMemo(() => ({
    cartItems,
    cartCount,
    loading,
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    refreshCart,
  }), [cartItems, cartCount, loading, addToCart, removeFromCart, updateQty, clearCart, refreshCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
