import { useState, useRef, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { Navbar, FloatingWhatsApp } from "./components/layout";
import { Toast } from "./components/ui";
import HomePage from "./pages/HomePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import PackagesPage from "./pages/PackagesPage";
import ComparePage from "./pages/ComparePage";
import ContactPage from "./pages/ContactPage";
import "./styles/index.css";

export default function App() {
  const [compareList, setCompareList] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMsg(msg);
    timerRef.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  return (
    <>
      <Navbar compareCount={compareList.length} />
      <Routes>
        <Route path="/" element={<HomePage compareList={compareList} setCompareList={setCompareList} showToast={showToast} />} />
        <Route path="/product/:id" element={<ProductDetailPage compareList={compareList} setCompareList={setCompareList} showToast={showToast} />} />
        <Route path="/packages" element={<PackagesPage showToast={showToast} />} />
        <Route path="/compare" element={<ComparePage compareList={compareList} setCompareList={setCompareList} />} />
        <Route path="/contact" element={<ContactPage showToast={showToast} />} />
      </Routes>
      <FloatingWhatsApp />
      {toastMsg && <Toast message={toastMsg} />}
    </>
  );
}
