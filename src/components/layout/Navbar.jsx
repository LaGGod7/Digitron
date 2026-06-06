import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon, WhatsAppIcon } from "../ui";
import siteConfig from "../../data/siteConfig";
import { searchProducts } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { label: "Products", path: "/" },
  { label: "Packages", path: "/packages" },
  { label: "Compare", path: "/compare" },
  { label: "Contact", path: "/contact" },
];

export default function Navbar({ compareCount, cartCount = 0 }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, logout } = useAuth();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let active = true;

    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return () => {
        active = false;
      };
    }

    setSearching(true);
    searchProducts(debouncedSearch, 8)
      .then((results) => {
        if (active) setSearchResults(results);
      })
      .catch(() => {
        if (active) setSearchResults([]);
      })
      .finally(() => {
        if (active) setSearching(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  useEffect(() => {
    const handleClick = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openWA = () =>
    window.open(
      `https://wa.me/${siteConfig.whatsappNumber}?text=Hi, I'm interested in your CCTV products`,
      "_blank"
    );

  const goto = (path) => {
    navigate(path);
    setMobileOpen(false);
    setSearchOpen(false);
    setProfileOpen(false);
  };

  const openProduct = (productId) => {
    setSearchTerm("");
    setSearchResults([]);
    goto(`/product/${productId}`);
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-logo" onClick={() => goto("/")}>
          <img
            src="/brand-mark.svg"
            alt={`${siteConfig.storeName} logo`}
            style={{ height: 36, objectFit: "contain" }}
          />
          <span className="nav-logo-text">{siteConfig.storeName}</span>
        </div>

        <div className="nav-links">
          {NAV_ITEMS.map((item) => (
            <span
              key={item.path}
              className={`nav-link ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => goto(item.path)}
            >
              {item.label}
              {item.label === "Compare" && compareCount > 0 && (
                <span
                  style={{
                    marginLeft: 4,
                    background: "var(--gold)",
                    color: "var(--obsidian)",
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 10,
                  }}
                >
                  {compareCount}
                </span>
              )}
            </span>
          ))}
        </div>

        <div className="nav-actions">
          <div className="global-search" ref={searchRef}>
            <Icon name="search" size={15} />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults[0]) openProduct(searchResults[0].id);
              }}
              placeholder="Search products"
              aria-label="Search products"
            />
            {searchTerm && (
              <button
                className="global-search-clear"
                onClick={() => {
                  setSearchTerm("");
                  setSearchResults([]);
                }}
                aria-label="Clear search"
              >
                <Icon name="x" size={13} />
              </button>
            )}
            {searchOpen && debouncedSearch.length >= 2 && (
              <div className="global-search-panel">
                {searching ? (
                  <div className="global-search-state">Searching Digitron catalog...</div>
                ) : searchResults.length === 0 ? (
                  <div className="global-search-state">No matching products</div>
                ) : (
                  searchResults.map((product) => (
                    <button
                      key={product.id}
                      className="global-search-result"
                      onClick={() => openProduct(product.id)}
                    >
                      <span>
                        <strong>{product.name}</strong>
                        <small>{product.brand} · {product.category}</small>
                      </span>
                      <em>{product.price > 0 ? `Rs. ${product.price.toLocaleString("en-IN")}` : "Quote"}</em>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <button className="btn-wa-nav" onClick={openWA}>
            <WhatsAppIcon size={14} /> WhatsApp
          </button>
          <button className="nav-icon-btn" onClick={() => goto("/cart")} aria-label="Open cart">
            <Icon name="shoppingCart" size={18} />
            {cartCount > 0 && <span className="nav-action-badge">{cartCount}</span>}
          </button>
          <div className="nav-profile" ref={profileRef}>
            {user ? (
              <>
                <button className="nav-avatar-btn" onClick={() => setProfileOpen((open) => !open)} aria-label="Open profile menu">
                  {user.avatar ? <img src={user.avatar} alt={user.name} /> : <span>{(user.name || "U").charAt(0).toUpperCase()}</span>}
                </button>
                {profileOpen && (
                  <div className="nav-profile-menu">
                    <button onClick={() => goto("/profile")}><Icon name="user" size={14} /> My Profile</button>
                    <button onClick={() => goto("/cart")}><Icon name="shoppingCart" size={14} /> My Cart</button>
                    <button onClick={logout}><Icon name="logOut" size={14} /> Logout</button>
                  </div>
                )}
              </>
            ) : (
              <button className="btn-login-nav" onClick={() => login(location.pathname + location.search)}>
                <span className="google-mark">G</span> Login
              </button>
            )}
          </div>
          <button className="nav-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
            <Icon name={mobileOpen ? "x" : "menu"} size={20} />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="mobile-menu">
          <div className="mobile-search">
            <Icon name="search" size={15} />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchResults[0]) openProduct(searchResults[0].id);
              }}
              placeholder="Search Digitron products"
            />
          </div>
          {searchOpen && debouncedSearch.length >= 2 && (
            <div className="global-search-panel">
              {searching ? (
                <div className="global-search-state">Searching Digitron catalog...</div>
              ) : searchResults.length === 0 ? (
                <div className="global-search-state">No matching products</div>
              ) : (
                searchResults.map((product) => (
                  <button
                    key={product.id}
                    className="global-search-result"
                    onClick={() => openProduct(product.id)}
                  >
                    <span>
                      <strong>{product.name}</strong>
                      <small>{product.brand} · {product.category}</small>
                    </span>
                    <em>{product.price > 0 ? `Rs. ${product.price.toLocaleString("en-IN")}` : "Quote"}</em>
                  </button>
                ))
              )}
            </div>
          )}
          {NAV_ITEMS.map((item) => (
            <div key={item.path} className="mobile-menu-link" onClick={() => goto(item.path)}>
              {item.label}
            </div>
          ))}
          <div className="mobile-menu-link" onClick={() => goto("/cart")}>
            Cart {cartCount > 0 ? `(${cartCount})` : ""}
          </div>
          <div className="mobile-menu-link" onClick={() => user ? goto("/profile") : login(location.pathname + location.search)}>
            {user ? "Profile" : "Login"}
          </div>
        </div>
      )}
    </>
  );
}
