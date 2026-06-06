import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useMutation } from "@tanstack/react-query";
import { DigitronLoader, Icon, ImagePlaceholder, WhatsAppIcon } from "../components/ui";
import { Footer } from "../components/layout";
import { fetchProductById, submitQuoteRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import siteConfig from "../data/siteConfig";

export default function CartPage({ showToast }) {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const { cartItems, cartCount, loading, updateQty, removeFromCart, clearCart } = useCart();

  const productQueries = useQueries({
    queries: cartItems.map((item) => ({
      queryKey: ["product", item.productId],
      queryFn: () => fetchProductById(item.productId),
      enabled: !!user && !!item.productId,
    }))
  });

  const productsById = useMemo(() => {
    const map = new Map();
    productQueries.forEach((query) => {
      if (query.data) map.set(query.data.id, query.data);
    });
    return map;
  }, [productQueries]);

  const quoteMutation = useMutation({
    mutationFn: () => submitQuoteRequest({
      customerName: user?.name || "Cart Customer",
      customerPhone: "Requested from customer cart",
      items: cartItems.map((item) => {
        const product = productsById.get(item.productId);
        return {
          id: item.productId,
          name: product?.name || item.productId,
          qty: item.quantity,
          customerEmail: user?.email,
          message: "Cart quote request"
        };
      })
    }),
    onSuccess: () => showToast("Quote request sent!"),
    onError: () => showToast("Could not send quote request. Try again.")
  });

  const openWhatsAppOrder = () => {
    const lines = cartItems.map((item, index) => {
      const product = productsById.get(item.productId);
      return `${index + 1}. ${product?.name || item.productId} - Qty: ${item.quantity}`;
    });
    const message = `Hi, I want to order these Digitron products:\n\n${lines.join("\n")}\n\nName: ${user.name}\nEmail: ${user.email}`;
    window.open(`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (!user) {
    return (
      <div className="page">
        <div className="customer-empty">
          <Icon name="shoppingCart" size={52} color="var(--gold-dark)" />
          <h1>Your cart is empty.</h1>
          <p>Login to access your saved cart.</p>
          <button className="btn-detail-primary" onClick={() => login("/cart")}>Login with Google</button>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return <div className="page"><DigitronLoader label="loading cart" /></div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="page">
        <div className="customer-empty">
          <Icon name="shoppingCart" size={52} color="var(--gold-dark)" />
          <h1>Your cart is empty</h1>
          <p>Build your CCTV quote list from the product catalog.</p>
          <button className="btn-detail-primary" onClick={() => navigate("/")}>Continue Shopping</button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="customer-page">
        <div className="customer-header">
          <div>
            <span className="page-header-label">Customer Cart</span>
            <h1>Review your quote list</h1>
          </div>
          <button className="btn-detail-outline" onClick={clearCart}>Clear Cart</button>
        </div>

        <div className="cart-layout">
          <div className="cart-items">
            {cartItems.map((item) => {
              const product = productsById.get(item.productId);
              return (
                <div className="cart-item" key={item.productId}>
                  <div className="cart-item-media" style={{ backgroundColor: "#ffffff", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
                    {product?.images && product.images[0] && product.images[0] !== "product" ? (
                      <img src={product.images[0]} alt={product?.name || "Product"} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }} />
                    ) : (
                      <ImagePlaceholder label={product?.category || "Product"} />
                    )}
                  </div>
                  <div className="cart-item-main">
                    <h3>{product?.name || "Loading product..."}</h3>
                    <p>{product?.category || "Digitron product"}</p>
                    <div className="cart-item-price">
                      {product?.price > 0 ? `Rs. ${product.price.toLocaleString("en-IN")}` : "Contact for price"}
                    </div>
                  </div>
                  <div className="qty-stepper">
                    <button onClick={() => updateQty(item.productId, item.quantity - 1)}><Icon name="minus" size={14} /></button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, item.quantity + 1)}><Icon name="plus" size={14} /></button>
                  </div>
                  <button className="cart-remove" onClick={() => removeFromCart(item.productId)} aria-label="Remove item">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <aside className="cart-summary">
            <h2>Order Summary</h2>
            <div className="summary-row"><span>Items</span><strong>{cartCount}</strong></div>
            <button className="btn-detail-primary" onClick={() => quoteMutation.mutate()} disabled={quoteMutation.isPending}>
              <Icon name="messageSquare" size={14} color="white" /> {quoteMutation.isPending ? "Sending..." : "Request a Quote"}
            </button>
            <button className="btn-detail-wa" onClick={openWhatsAppOrder}>
              <WhatsAppIcon size={16} /> WhatsApp Order
            </button>
            <button className="summary-link" onClick={() => navigate("/")}>Continue Shopping</button>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}
