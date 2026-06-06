import { useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DigitronLoader, Icon } from "../components/ui";
import { Footer, ProductCard } from "../components/layout";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProducts, getWishlist, toggleWishlist } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

/* ── Slug ↔ Category mapping ── */
const SLUG_MAP = {
  "cameras":              "Cameras",
  "dvr":                  "DVR",
  "nvr":                  "NVR",
  "cables-connectors":    "Cables & Connectors",
  "networking":           "Networking",
  "storage":              "Storage",
  "mounting-enclosures":  "Mounting & Enclosures",
  "power-supplies":       "Power Supplies",
  "displays":             "Displays",
  "services":             "Services",
  "access-accessories":   "Access & Accessories",
  "accessories":          "Accessories",
};

const CATEGORY_ICONS = {
  Cameras:                "camera",
  DVR:                    "grid",
  NVR:                    "grid",
  "Cables & Connectors":  "zap",
  Networking:             "settings",
  Storage:                "inbox",
  "Mounting & Enclosures":"package",
  "Power Supplies":       "zap",
  Displays:               "eye",
  Services:               "messageSquare",
  "Access & Accessories": "shield",
  Accessories:            "package",
};

/* Categories where we show brand sub-cards */
const BRAND_CATEGORIES = ["Cameras"];

/* Brand accent colors for the cards */
const BRAND_COLORS = {
  "CP Plus":    "#FF6600",
  "Dahua":      "#006EC7",
  "Hikvision":  "#E02020",
  "Imou":       "#FF9500",
  "Tiandy":     "#00A651",
  "Secureye":   "#8B5CF6",
  "Securus":    "#3B82F6",
  "Trueview":   "#10B981",
  "TP-Link":    "#4CAF50",
  "Zebronics":  "#F43F5E",
  "Cofe":       "#6366F1",
  "IP Nerve":   "#0EA5E9",
  "Multi Power":"#D97706",
  "Generic":    "#6B7280",
};

const LOCATIONS = ["All", "Indoor", "Outdoor", "Both"];

export default function CategoryPage({ compareList, setCompareList, showToast }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const queryClient = useQueryClient();
  const { user, login } = useAuth();
  const { addToCart } = useCart();

  const categoryName = SLUG_MAP[slug];
  const isBrandCategory = BRAND_CATEGORIES.includes(categoryName);

  /* State */
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [resolution, setResolution]       = useState("All");
  const [location, setLocation]           = useState("All");
  const [search, setSearch]               = useState("");

  /* All products in this category */
  const { data: categoryProducts = [], isLoading } = useQuery({
    queryKey: ['products', slug],
    queryFn: () => fetchProducts(slug),
    enabled: !!categoryName
  });

  const { data: wishlist = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: !!user
  });

  const wishlistMutation = useMutation({
    mutationFn: (productId) => toggleWishlist(productId),
    onSuccess: (data) => {
      queryClient.setQueryData(['wishlist'], data.wishlist || []);
      showToast(data.wishlisted ? "Saved to wishlist" : "Removed from wishlist");
    },
    onError: () => showToast("Could not update wishlist. Try again.")
  });

  /* Build brand cards data dynamically */
  const brandCards = useMemo(() => {
    if (!isBrandCategory || !categoryProducts.length) return [];
    const brandMap = {};
    categoryProducts.forEach(p => {
      if (!brandMap[p.brand]) brandMap[p.brand] = { count: 0, inStock: 0 };
      brandMap[p.brand].count++;
      if (p.stockStatus === "In Stock" || p.stock === "In Stock") brandMap[p.brand].inStock++;
    });
    return Object.entries(brandMap)
      .map(([name, data]) => ({
        id: name,
        title: name,
        count: data.count,
        inStock: data.inStock,
        color: BRAND_COLORS[name] || "#6B7280",
      }))
      .filter(b => b.id !== "Generic") // Put Generic last
      .sort((a, b) => b.count - a.count)
      .concat(brandMap["Generic"] ? [{
        id: "Generic",
        title: "Other / Generic",
        count: brandMap["Generic"].count,
        inStock: brandMap["Generic"].inStock,
        color: BRAND_COLORS["Generic"],
      }] : []);
  }, [categoryProducts, isBrandCategory]);

  /* Available resolutions */
  const resolutions = useMemo(() => {
    const set = new Set(categoryProducts.map(p => p.resolution).filter(r => r && r !== "Other"));
    return ["All", ...Array.from(set).sort()];
  }, [categoryProducts]);

  /* Filtered products */
  const filtered = useMemo(() => categoryProducts.filter(p => {
    if (selectedBrand && p.brand !== selectedBrand) return false;
    if (resolution !== "All" && p.resolution !== resolution) return false;
    if (location !== "All") {
      if (location === "Indoor"  && !["Indoor", "Both"].includes(p.indoorOutdoor || p.indoor_outdoor)) return false;
      if (location === "Outdoor" && !["Outdoor", "Both"].includes(p.indoorOutdoor || p.indoor_outdoor)) return false;
      if (location === "Both"    && (p.indoorOutdoor || p.indoor_outdoor) !== "Both") return false;
    }
    if (search) {
      const term = search.toLowerCase();
      if (!p.name.toLowerCase().includes(term) && !(p.brand || "").toLowerCase().includes(term) && !(p.barcode || "").includes(term)) return false;
    }
    return true;
  }), [categoryProducts, selectedBrand, resolution, location, search]);

  if (!categoryName) {
    return (
      <div className="page">
        <div className="detail-page">
          <div className="empty-state">
            <Icon name="alertCircle" size={40} color="var(--mid-gray)" />
            <h3>Category not found</h3>
            <button className="btn-detail-primary" onClick={() => navigate("/")}>Go Home</button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="page">
        <DigitronLoader label="loading products" />
      </div>
    );
  }

  /* Should we show brand sub-cards? */
  const showBrandGrid = isBrandCategory && !selectedBrand && !search;

  const handleCompare = (product) => {
    if (compareList.some(p => p.id === product.id)) {
      setCompareList(compareList.filter(p => p.id !== product.id));
    } else if (compareList.length < 2) {
      setCompareList([...compareList, product]);
      showToast(`${product.name.split(" ")[0]}... added to compare`);
    } else {
      showToast("Max 2 products for comparison. Remove one first.");
    }
  };

  const handleAddToCart = async (product) => {
    if (!user) {
      showToast("Login to add products to cart");
      login(routeLocation.pathname + routeLocation.search);
      return;
    }
    try {
      await addToCart(product.id);
      showToast("Added to cart!");
    } catch {
      showToast("Could not add to cart. Try again.");
    }
  };

  const handleToggleWishlist = (product) => {
    if (!user) {
      showToast("Login to save to wishlist");
      login(routeLocation.pathname + routeLocation.search);
      return;
    }
    wishlistMutation.mutate(product.id);
  };

  const clearFilters = () => {
    setSelectedBrand(null);
    setResolution("All");
    setLocation("All");
    setSearch("");
  };

  const hasFilters = selectedBrand || resolution !== "All" || location !== "All" || search;
  const icon = CATEGORY_ICONS[categoryName] || "package";

  return (
    <div className="page">
      {/* Page Header */}
      <div className="cat-page-header">
        <div className="cat-page-header-inner">
          <div className="cat-breadcrumb">
            <span className="breadcrumb-link" onClick={() => navigate("/")}>Home</span>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-link" onClick={() => navigate("/")}>Categories</span>
            <span className="breadcrumb-sep">›</span>
            <span style={{ color: "rgba(255,255,255,0.7)" }}>{categoryName}</span>
            {selectedBrand && (
              <>
                <span className="breadcrumb-sep">›</span>
                <span style={{ color: "rgba(255,255,255,0.7)" }}>{selectedBrand}</span>
              </>
            )}
          </div>

          <div className="cat-header-content">
            <div className="cat-header-icon-wrap">
              <Icon name={icon} size={36} color="var(--gold)" />
            </div>
            <div>
              <h1 className="cat-header-title">
                {selectedBrand ? `${selectedBrand} ${categoryName}` : categoryName}
              </h1>
              <p className="cat-header-desc">
                {categoryProducts.length} products · {categoryProducts.filter(p => p.stock === "In Stock").length} in stock
                {isBrandCategory && !selectedBrand && ` · ${brandCards.length} brands`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      {!showBrandGrid && (
        <div className="filter-bar-wrap">
          <div className="filter-bar">
            {isBrandCategory && selectedBrand && (
              <button className="filter-back" onClick={() => setSelectedBrand(null)}>
                <Icon name="arrowLeft" size={13} /> All Brands
              </button>
            )}
            {!isBrandCategory && (
              <button className="filter-back" onClick={() => navigate("/")}>
                <Icon name="arrowLeft" size={13} /> Categories
              </button>
            )}
            {isBrandCategory && !selectedBrand && (
              <button className="filter-back" onClick={() => { setSearch(""); navigate("/"); }}>
                <Icon name="arrowLeft" size={13} /> Categories
              </button>
            )}
            {resolutions.length > 2 && (
              <select className="filter-select" value={resolution} onChange={e => setResolution(e.target.value)}>
                {resolutions.map(r => <option key={r} value={r}>{r === "All" ? "All Resolutions" : r}</option>)}
              </select>
            )}
            <div className="filter-toggle">
              {LOCATIONS.map(l => (
                <button key={l} className={`filter-toggle-btn ${location === l ? "active" : ""}`} onClick={() => setLocation(l)}>
                  {l}
                </button>
              ))}
            </div>
            <input className="filter-input" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
            {hasFilters && <button className="filter-clear" onClick={clearFilters}>✕ Clear</button>}
            <span className="filter-count">{filtered.length} products</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="products-section" id="products-grid">
        {showBrandGrid ? (
          <>
            <div className="products-header">
              <h2 className="products-title">Shop by Brand</h2>
              <span className="filter-count">{brandCards.length} brands</span>
            </div>
            <div className="brand-grid">
              {brandCards.map(brand => (
                <div
                  key={brand.id}
                  className="brand-card"
                  onClick={() => setSelectedBrand(brand.id)}
                >
                  <div className="brand-card-accent" style={{ background: brand.color }} />
                  <div className="brand-card-icon" style={{ background: `${brand.color}18` }}>
                    <Icon name="shield" size={32} color={brand.color} />
                  </div>
                  <h3 className="brand-card-title">{brand.title}</h3>
                  <div className="brand-card-meta">
                    <span>{brand.count} products</span>
                    <span>·</span>
                    <span>{brand.inStock} in stock</span>
                  </div>
                  <div className="brand-card-arrow">
                    <Icon name="chevronRight" size={16} color="var(--mid-gray)" />
                  </div>
                </div>
              ))}
            </div>

            {/* Show all cameras below brands */}
            <div className="products-header" style={{ marginTop: 48 }}>
              <h2 className="products-title">All {categoryName}</h2>
              <span className="filter-count">{categoryProducts.length} products</span>
            </div>
            <div className="products-grid">
              {categoryProducts.slice(0, 12).map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onView={(product) => navigate(`/product/${product.id}`)}
                  compareList={compareList}
                  onCompare={handleCompare}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={wishlist.includes(p.id)}
                />
              ))}
            </div>
            {categoryProducts.length > 12 && (
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <button className="btn-detail-primary" style={{ display: "inline-flex" }} onClick={() => setSelectedBrand("")}>
                  View All {categoryProducts.length} Products <Icon name="chevronRight" size={14} color="white" />
                </button>
              </div>
            )}
          </>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Icon name="search" size={32} color="var(--light-gray)" />
            <h3>No products found</h3>
            <p>Try adjusting your filters</p>
            <button className="btn-detail-primary" style={{ marginTop: 16, display: "inline-flex" }} onClick={clearFilters}>Clear Filters</button>
          </div>
        ) : (
          <>
            <div className="products-header">
              <h2 className="products-title">
                {selectedBrand ? `${selectedBrand} ${categoryName}` : `All ${categoryName}`}
              </h2>
              <span className="filter-count">{filtered.length} products</span>
            </div>
            <div className="products-grid">
              {filtered.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onView={(product) => navigate(`/product/${product.id}`)}
                  compareList={compareList}
                  onCompare={handleCompare}
                  onAddToCart={handleAddToCart}
                  onToggleWishlist={handleToggleWishlist}
                  isWishlisted={wishlist.includes(p.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Compare Bar */}
      <div className={`compare-bar ${compareList.length > 0 ? "visible" : ""}`}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
          {compareList.length} / 2 selected for comparison
        </div>
        <div className="compare-bar-items">
          {compareList.map(p => (
            <div key={p.id} className="compare-item">
              {p.name.substring(0, 20)}...
              <span className="compare-remove" onClick={() => setCompareList(compareList.filter(x => x.id !== p.id))}>x</span>
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
    </div>
  );
}
