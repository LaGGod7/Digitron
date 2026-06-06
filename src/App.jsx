import { useState, useRef, useCallback, useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { Navbar, FloatingWhatsApp } from "./components/layout";
import { Toast } from "./components/ui";
import { fetchSettings } from "./services/api";
import HomePage from "./pages/HomePage";
import CategoryPage from "./pages/CategoryPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import PackagesPage from "./pages/PackagesPage";
import ComparePage from "./pages/ComparePage";
import ContactPage from "./pages/ContactPage";
import AdminPage from "./pages/AdminPage";
import CartPage from "./pages/CartPage";
import ProfilePage from "./pages/ProfilePage";
import { useCart } from "./context/CartContext";
import "./styles/index.css";

export default function App() {
  const [compareList, setCompareList] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);
  const timerRef = useRef(null);
  const location = useLocation();
  const { cartCount } = useCart();

  const showToast = useCallback((msg) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMsg(msg);
    timerRef.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) return;

    fetchSettings()
      .then((settings) => {
        const { features, ...configOverrides } = settings;
        const nextConfig = JSON.stringify(configOverrides);
        const nextReviews = features?.enableReviews ? 'true' : 'false';
        const nextCalculator = features?.enableCalculator ? 'true' : 'false';
        const hasChanged =
          localStorage.getItem('ae_site_config') !== nextConfig ||
          localStorage.getItem('ae_enable_reviews') !== nextReviews ||
          localStorage.getItem('ae_enable_calculator') !== nextCalculator;

        if (hasChanged) {
          localStorage.setItem('ae_site_config', nextConfig);
          localStorage.setItem('ae_enable_reviews', nextReviews);
          localStorage.setItem('ae_enable_calculator', nextCalculator);
          window.location.reload();
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  return (
    <>
      {!isAdmin && <Navbar compareCount={compareList.length} cartCount={cartCount} />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:slug" element={<CategoryPage compareList={compareList} setCompareList={setCompareList} showToast={showToast} />} />
        <Route path="/product/:id" element={<ProductDetailPage compareList={compareList} setCompareList={setCompareList} showToast={showToast} />} />
        <Route path="/packages" element={<PackagesPage showToast={showToast} />} />
        <Route path="/compare" element={<ComparePage compareList={compareList} setCompareList={setCompareList} />} />
        <Route path="/contact" element={<ContactPage showToast={showToast} />} />
        <Route path="/cart" element={<CartPage showToast={showToast} />} />
        <Route path="/profile" element={<ProfilePage showToast={showToast} />} />
        <Route path="/admin" element={<AdminPage showToast={showToast} />} />
      </Routes>
      {!isAdmin && <FloatingWhatsApp />}
      {toastMsg && <Toast message={toastMsg} />}
    </>
  );
}
