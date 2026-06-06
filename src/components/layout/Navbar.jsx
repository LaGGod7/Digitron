import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon, WhatsAppIcon } from "../ui";
import siteConfig from "../../data/siteConfig";

const NAV_ITEMS = [
  { label: "Products", path: "/" },
  { label: "Packages", path: "/packages" },
  { label: "Compare", path: "/compare" },
  { label: "Contact", path: "/contact" },
];

export default function Navbar({ compareCount }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const openWA = () =>
    window.open(
      `https://wa.me/${siteConfig.whatsappNumber}?text=Hi, I'm interested in your CCTV products`,
      "_blank"
    );

  const goto = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-logo" onClick={() => goto("/")}>
          <img
            src="/logo.png"
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
          <button className="btn-wa-nav" onClick={openWA}>
            <WhatsAppIcon size={14} /> WhatsApp
          </button>
          <button className="nav-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
            <Icon name={mobileOpen ? "x" : "menu"} size={20} />
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="mobile-menu">
          {NAV_ITEMS.map((item) => (
            <div key={item.path} className="mobile-menu-link" onClick={() => goto(item.path)}>
              {item.label}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
