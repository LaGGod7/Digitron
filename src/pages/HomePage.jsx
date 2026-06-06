import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/ui";
import { Footer, ProductCard } from "../components/layout";
import products from "../data/products";
import siteConfig from "../data/siteConfig";

const CATEGORIES = ["All", "IP Camera", "Analog", "NVR", "DVR", "Cables"];
const RESOLUTIONS = ["All", "2MP", "4MP", "8MP", "Other"];
const LOCATIONS = ["Indoor", "Outdoor", "Both"];

export default function HomePage({ compareList, setCompareList, showToast }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState("All");
  const [resolution, setResolution] = useState("All");
  const [location, setLocation] = useState("Both");
  const [search, setSearch] = useState("");

  const filtered = products.filter((p) => {
    if (category !== "All" && !p.category.includes(category) && !p.type.includes(category)) return false;
    if (resolution !== "All" && p.resolution !== resolution) return false;
    if (location !== "Both") {
      if (location === "Indoor" && !["Indoor", "Both"].includes(p.indoor_outdoor)) return false;
      if (location === "Outdoor" && !["Outdoor", "Both"].includes(p.indoor_outdoor)) return false;
    }
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.brand.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCompare = (product) => {
    if (compareList.some((p) => p.id === product.id)) {
      setCompareList(compareList.filter((p) => p.id !== product.id));
    } else if (compareList.length < 2) {
      setCompareList([...compareList, product]);
      showToast(`${product.name.split(" ")[0]}... added to compare`);
    } else {
      showToast("Max 2 products for comparison. Remove one first.");
    }
  };

  const clearFilters = () => {
    setCategory("All");
    setResolution("All");
    setLocation("Both");
    setSearch("");
  };

  const hasFilters = category !== "All" || resolution !== "All" || location !== "Both" || search;

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-grid-overlay" />
        <div className="hero-inner">
          <div className="hero-badge">
            <Icon name="mapPin" size={10} color="var(--gold)" /> CCTV SOLUTIONS — HUBBALI, KARNATAKA
          </div>
          <h1 className="hero-h1">
            Secure Your Space<br />With <span>Confidence</span>
          </h1>
          <p className="hero-sub">
            Professional-grade CCTV systems for homes, shops and commercial spaces. Trusted by hundreds
            of customers across Hubbali and North Karnataka.
          </p>
          <div className="hero-ctas">
            <button
              className="btn-hero-primary"
              onClick={() => document.getElementById("products-grid")?.scrollIntoView({ behavior: "smooth" })}
            >
              Browse Products <Icon name="chevronRight" size={14} color="var(--obsidian)" />
            </button>
            <button className="btn-hero-ghost" onClick={() => navigate("/packages")}>
              View Packages
            </button>
          </div>
          <div className="hero-stats">
            <div><div className="hero-stat-num">500+</div><div className="hero-stat-label">INSTALLATIONS</div></div>
            <div><div className="hero-stat-num">12+</div><div className="hero-stat-label">TOP BRANDS</div></div>
            <div><div className="hero-stat-num">5yr</div><div className="hero-stat-label">IN BUSINESS</div></div>
            <div><div className="hero-stat-num">4.7★</div><div className="hero-stat-label">AVG RATING</div></div>
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="filter-bar-wrap">
        <div className="filter-bar">
          <select className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={resolution} onChange={(e) => setResolution(e.target.value)}>
            {RESOLUTIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <div className="filter-toggle">
            {LOCATIONS.map((l) => (
              <button key={l} className={`filter-toggle-btn ${location === l ? "active" : ""}`} onClick={() => setLocation(l)}>
                {l}
              </button>
            ))}
          </div>
          <input className="filter-input" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {hasFilters && <button className="filter-clear" onClick={clearFilters}>✕ Clear</button>}
          <span className="filter-count">{filtered.length} products</span>
        </div>
      </div>

      {/* Products Grid */}
      <div className="products-section" id="products-grid">
        <div className="products-header">
          <h2 className="products-title">
            {category === "All" && resolution === "All" ? "All Products" : `${category !== "All" ? category : ""} ${resolution !== "All" ? resolution : ""}`.trim()}
          </h2>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Icon name="search" size={32} color="var(--light-gray)" />
            <h3>No products found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="products-grid">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onView={(product) => navigate(`/product/${product.id}`)}
                compareList={compareList}
                onCompare={handleCompare}
              />
            ))}
          </div>
        )}
      </div>

      {/* Compare Bar */}
      <div className={`compare-bar ${compareList.length > 0 ? "visible" : ""}`}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
          {compareList.length} / 2 selected for comparison
        </div>
        <div className="compare-bar-items">
          {compareList.map((p) => (
            <div key={p.id} className="compare-item">
              {p.name.substring(0, 20)}...
              <span className="compare-remove" onClick={() => setCompareList(compareList.filter((x) => x.id !== p.id))}>✕</span>
            </div>
          ))}
          {compareList.length < 2 && (
            <div className="compare-item" style={{ opacity: 0.4, borderStyle: "dashed" }}>+ Select another</div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {compareList.length === 2 && (
            <button className="btn-compare" onClick={() => navigate("/compare")}>Compare Now</button>
          )}
          <button
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "none", borderRadius: 4, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}
            onClick={() => setCompareList([])}
          >Clear</button>
        </div>
      </div>

      <Footer />
    </>
  );
}
