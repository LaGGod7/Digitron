import { useState } from "react";
import { Icon, WhatsAppIcon, BestForTag } from "../components/ui";
import { Footer } from "../components/layout";
import bundles from "../data/bundles";
import siteConfig from "../data/siteConfig";

export default function PackagesPage() {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-inner">
          <div className="page-header-label">Curated for every need</div>
          <h1 className="page-header-title">Ready-Made Security Packages</h1>
        </div>
      </div>
      <div className="section-wrap" style={{ paddingTop: 40 }}>
        <div className="bundles-grid">
          {bundles.map((b) => (
            <div key={b.id} className="bundle-card">
              <div className="bundle-card-header">
                <div className="bundle-icon"><Icon name={b.icon} size={28} color="var(--gold)" /></div>
                <div className="bundle-name">{b.name}</div>
                <div className="bundle-desc">{b.description}</div>
                <div className="card-tags" style={{ marginTop: 4 }}>
                  {b.best_for.map((t) => <BestForTag key={t} tag={t} />)}
                </div>
              </div>
              <div className="bundle-body">
                <div className="bundle-components-title">What's Included</div>
                {b.components.slice(0, expanded === b.id ? undefined : 4).map((c, i) => (
                  <div key={i} className="bundle-component-row">
                    <Icon name="check" size={12} color="var(--gold)" />
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <span className="bundle-qty">×{c.qty}</span>
                  </div>
                ))}
                {b.components.length > 4 && (
                  <button
                    style={{ background: "none", border: "none", color: "var(--mid-gray)", fontSize: 12, cursor: "pointer", padding: "6px 0" }}
                    onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                  >
                    {expanded === b.id ? "▲ Show less" : `▼ Show ${b.components.length - 4} more`}
                  </button>
                )}
                <div className="bundle-pricing">
                  <span className="bundle-price">₹{b.total_price.toLocaleString("en-IN")}</span>
                  <span className="bundle-original">₹{b.original_price.toLocaleString("en-IN")}</span>
                  <span className="bundle-save">Save ₹{(b.original_price - b.total_price).toLocaleString("en-IN")}</span>
                </div>
                <button
                  className="btn-detail-wa"
                  style={{ width: "100%", justifyContent: "center" }}
                  onClick={() => window.open(`https://wa.me/${siteConfig.whatsappNumber}?text=Hi, I'm interested in the ${b.name}`, "_blank")}
                >
                  <WhatsAppIcon size={15} /> WhatsApp Enquiry
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
