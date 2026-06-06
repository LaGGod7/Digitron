import { useNavigate } from "react-router-dom";
import { Icon, WhatsAppIcon } from "../components/ui";
import { Footer } from "../components/layout";
import siteConfig from "../data/siteConfig";

const SPEC_ROWS = ["Price", "Resolution", "Type", "Indoor/Outdoor", "Night Vision", "Weatherproof", "Warranty", "Avg Rating", "Best For"];

function getSpecValue(product, field) {
  if (!product) return null;
  const map = {
    Price: `₹${product.price.toLocaleString("en-IN")}`,
    Resolution: product.resolution,
    Type: product.type,
    "Indoor/Outdoor": product.indoor_outdoor,
    "Night Vision": product.specs?.NightVision || "—",
    Weatherproof: product.specs?.Weatherproof || "—",
    Warranty: product.specs?.Warranty || "—",
    "Avg Rating": `${product.avg_rating} ★ (${product.review_count})`,
    "Best For": product.best_for.join(", "),
  };
  return map[field];
}

export default function ComparePage({ compareList, setCompareList }) {
  const navigate = useNavigate();
  const [a, b] = [...compareList, null, null].slice(0, 2);

  const hasDiff = (field) => a && b && getSpecValue(a, field) !== getSpecValue(b, field);

  if (!a && !b) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-header-inner">
            <div className="page-header-label">Side-by-side comparison</div>
            <h1 className="page-header-title">Compare Products</h1>
          </div>
        </div>
        <div className="compare-page">
          <div className="empty-state">
            <Icon name="grid" size={40} color="var(--light-gray)" />
            <h3>No products selected</h3>
            <p>Go to Products and click the + button on up to 2 products to compare them</p>
            <button className="btn-detail-primary" style={{ marginTop: 16 }} onClick={() => navigate("/")}>Browse Products</button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-header-label">Side-by-side comparison</div>
          <h1 className="page-header-title">Compare Products</h1>
        </div>
      </div>
      <div className="compare-page">
        <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--mid-gray)" }}>{compareList.length} product(s) selected</span>
          <button className="filter-clear" onClick={() => { setCompareList([]); navigate("/"); }}>✕ Clear all</button>
          <button className="btn-compare" onClick={() => navigate("/")}>+ Add products</button>
        </div>

        <div className="compare-grid">
          <div className="compare-col">
            <div className="compare-header compare-row-label" style={{ height: 120 }} />
            {SPEC_ROWS.map((r) => <div key={r} className="compare-row compare-row-label">{r}</div>)}
            <div className="compare-row compare-row-label">Action</div>
          </div>
          {[a, b].map((product, idx) => (
            <div key={idx} className="compare-col">
              <div className="compare-header" style={{ height: 120, position: "relative" }}>
                {product ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ background: "var(--gold)", color: "var(--obsidian)", fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 2, display: "inline-block", width: "fit-content" }}>{product.brand}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{product.name.substring(0, 40)}</span>
                    <button style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--mid-gray)" }} onClick={() => setCompareList(compareList.filter((p) => p.id !== product.id))}>✕</button>
                  </div>
                ) : (
                  <div className="compare-placeholder"><Icon name="plus" size={20} color="var(--light-gray)" /><span>Select a product</span></div>
                )}
              </div>
              {SPEC_ROWS.map((field) => (
                <div key={field} className={`compare-row ${hasDiff(field) ? "compare-diff" : ""}`}>
                  {product ? getSpecValue(product, field) : <span style={{ color: "var(--light-gray)" }}>—</span>}
                </div>
              ))}
              <div className="compare-row">
                {product && (
                  <button className="btn-wa-card" style={{ width: "100%", height: "auto", padding: "7px 12px", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", gap: 6, justifyContent: "center", fontSize: 12 }} onClick={() => window.open(`https://wa.me/${siteConfig.whatsappNumber}?text=Hi, I'm interested in the ${product.name}`, "_blank")}>
                    <WhatsAppIcon size={13} /> Enquire
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--mid-gray)" }}>
          <span style={{ background: "#FFF9ED", padding: "2px 8px", borderRadius: 3 }}>Highlighted rows</span> indicate differences between products.
        </div>
      </div>
      <Footer />
    </div>
  );
}
