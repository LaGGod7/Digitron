import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DigitronLoader, Icon } from "../components/ui";
import { Footer, ProductCard } from "../components/layout";
import { useQuery } from '@tanstack/react-query';
import { fetchPopularProducts } from '../services/api';
import products from "../data/products";
import siteConfig from "../data/siteConfig";
import CountUp from "react-countup";
import { useInView } from "react-intersection-observer";

const CATEGORY_ICONS = {
  Cameras: "camera",
  DVR: "grid",
  NVR: "grid",
  "Cables & Connectors": "zap",
  Networking: "settings",
  Storage: "inbox",
  "Mounting & Enclosures": "package",
  "Power Supplies": "zap",
  Displays: "eye",
  Services: "messageSquare",
  "Access & Accessories": "shield",
  Accessories: "package",
};

/* Slug for each category */
const SLUG_MAP = {
  Cameras:                "cameras",
  DVR:                    "dvr",
  NVR:                    "nvr",
  "Cables & Connectors":  "cables-connectors",
  Networking:             "networking",
  Storage:                "storage",
  "Mounting & Enclosures":"mounting-enclosures",
  "Power Supplies":       "power-supplies",
  Displays:               "displays",
  Services:               "services",
  "Access & Accessories": "access-accessories",
  Accessories:            "accessories",
};

function AnimatedStat({ end, suffix, label, decimals = 0 }) {
  const [ref, inView] = useInView({ triggerOnce: true });
  const CountUpComp = CountUp.default || CountUp;
  return (
    <div ref={ref}>
      <div className="hero-stat-num">
        {inView ? <CountUpComp end={end} duration={2.2} suffix={suffix} decimals={decimals} /> : 0}
      </div>
      <div className="hero-stat-label">{label}</div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  const { data: popularProducts = [], isLoading: loadingPopular } = useQuery({
    queryKey: ['homepage-popular-products'],
    queryFn: fetchPopularProducts
  });

  const categories = useMemo(() => {
    const grouped = products.reduce((acc, product) => {
      if (!acc[product.category]) acc[product.category] = [];
      acc[product.category].push(product);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([name, items]) => ({
        name,
        count: items.length,
        brands: [...new Set(items.map((p) => p.brand))].sort(),
        inStock: items.filter((p) => p.stock === "In Stock").length,
        slug: SLUG_MAP[name] || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      }))
      .sort((a, b) => b.count - a.count);
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-grid-overlay" />
        <div className="hero-inner">
          <div className="hero-badge">
            <Icon name="mapPin" size={10} color="var(--gold)" /> CCTV SOLUTIONS — HUBBALI, KARNATAKA
          </div>
          <h1 className="hero-h1">
            {siteConfig.storeName}<br /><span>Security Catalog</span>
          </h1>
          <p className="hero-sub">
            Browse CCTV cameras, DVR/NVR systems, storage, cables, networking equipment, and installation services from one shop catalog.
          </p>
          <div className="hero-ctas">
            <button
              className="btn-hero-primary"
              onClick={() => document.getElementById("category-grid")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Categories <Icon name="chevronRight" size={14} color="var(--obsidian)" />
            </button>
            <button className="btn-hero-ghost" onClick={() => navigate("/contact")}>
              Request Quote
            </button>
          </div>
          <div className="hero-stats">
            <AnimatedStat end={products.length} suffix="+" label="PRODUCTS" />
            <AnimatedStat end={categories.length} suffix="" label="CATEGORIES" />
            <AnimatedStat end={categories.find((c) => c.name === "Cameras")?.brands.length || 0} suffix="+" label="CAMERA BRANDS" />
            <AnimatedStat end={4.6} suffix="★" label="AVG RATING" decimals={1} />
          </div>
        </div>
      </section>

      <div className="products-section" id="category-grid">
        <div className="products-header">
          <h2 className="products-title">Product Categories</h2>
          <span className="filter-count">{products.length} products listed</span>
        </div>
        <div className="category-grid">
          {categories.map((category) => (
            <button
              key={category.name}
              className="category-card"
              onClick={() => navigate(`/category/${category.slug}`)}
            >
              <span className="category-icon"><Icon name={CATEGORY_ICONS[category.name] || "package"} size={24} /></span>
              <span className="category-name">{category.name}</span>
              <span className="category-meta">{category.count} products</span>
              <span className="category-meta">{category.inStock} in stock</span>
              {category.name === "Cameras" && (
                <span className="category-brands">{category.brands.filter(b => b !== "Generic").slice(0, 6).join(", ")}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Commonly Searched / Most Visited Products */}
      <div className="products-section" style={{ borderTop: '0.5px solid var(--light-gray)', paddingTop: '40px', marginTop: '20px' }}>
        <div className="products-header">
          <div>
            <h2 className="products-title" style={{ margin: 0 }}>Commonly Searched & Most Visited Products</h2>
            <p style={{ fontSize: '13px', color: 'var(--mid-gray)', marginTop: '4px', marginBottom: 0 }}>Trending equipment and most viewed items by visitors</p>
          </div>
          <span className="filter-count">Live Popularity</span>
        </div>
        
        {loadingPopular ? (
          <div style={{ padding: '18px 0 4px' }}>
            <DigitronLoader label="loading trends" compact />
          </div>
        ) : popularProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--mid-gray)', fontSize: '14px' }}>No items visited yet. Start browsing to see popular items!</div>
        ) : (
          <div className="scroll-strip" style={{ paddingBottom: '10px' }}>
            {popularProducts.map((p) => (
              <ProductCard 
                key={p.id} 
                product={p} 
                onView={() => { navigate(`/product/${p.id}`); window.scrollTo(0, 0); }}
                compareList={[]}
                onCompare={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}
