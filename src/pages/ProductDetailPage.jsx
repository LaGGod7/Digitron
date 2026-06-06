import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Icon, WhatsAppIcon, StarRating, BestForTag, ImagePlaceholder } from "../components/ui";
import { Footer, ProductCard } from "../components/layout";
import products from "../data/products";
import bundles from "../data/bundles";
import seedReviews from "../data/reviews";
import siteConfig from "../data/siteConfig";

export default function ProductDetailPage({ compareList, setCompareList, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = products.find((p) => p.id === Number(id));

  const [localReviews, setLocalReviews] = useState(seedReviews.filter((r) => r.product_id === Number(id)));
  const [form, setForm] = useState({ name: "", rating: 0, text: "" });
  const [hoverStar, setHoverStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  if (!product) {
    return (
      <div className="page">
        <div className="detail-page">
          <div className="empty-state">
            <h3>Product not found</h3>
            <button className="btn-detail-primary" onClick={() => navigate("/")}>Go back</button>
          </div>
        </div>
      </div>
    );
  }

  const related = products.filter((p) => p.id !== product.id && (p.category === product.category || p.best_for.some((b) => product.best_for.includes(b)))).slice(0, 4);
  const avgRating = localReviews.length > 0 ? (localReviews.reduce((a, r) => a + r.rating, 0) / localReviews.length).toFixed(1) : product.avg_rating;
  const ratingBars = [5, 4, 3, 2, 1].map((star) => ({ star, count: localReviews.filter((r) => r.rating === star).length, pct: localReviews.length > 0 ? Math.round((localReviews.filter((r) => r.rating === star).length / localReviews.length) * 100) : 0 }));

  const submitReview = () => {
    if (form.rating === 0) { showToast("Please select a star rating"); return; }
    if (form.text.length < 10) { showToast("Review must be at least 10 characters"); return; }
    setSubmitting(true);
    setTimeout(() => {
      const newReview = { id: Date.now(), product_id: product.id, reviewer_name: form.name || "Anonymous", rating: form.rating, review_text: form.text, created_at: new Date().toISOString().split("T")[0], is_verified: false, helpful_yes: 0, helpful_no: 0 };
      setLocalReviews([newReview, ...localReviews]);
      setForm({ name: "", rating: 0, text: "" });
      setSubmitting(false);
      showToast("Review submitted! It will appear after admin approval.");
    }, 600);
  };

  const voteHelpful = (reviewId, field) => {
    setLocalReviews(localReviews.map((r) => (r.id === reviewId ? { ...r, [field]: r[field] + 1 } : r)));
  };

  const isCompared = compareList.some((p) => p.id === product.id);
  const toggleCompare = () => {
    if (isCompared) setCompareList(compareList.filter((p) => p.id !== product.id));
    else if (compareList.length < 2) { setCompareList([...compareList, product]); showToast("Added to comparison"); }
    else showToast("Max 2 products. Remove one first.");
  };

  const timeAgo = (dateStr) => {
    const days = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const matchingBundles = bundles.filter((b) => b.best_for.some((bf) => product.best_for.includes(bf)));

  return (
    <div className="page">
      <div className="detail-page">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <span className="breadcrumb-link" onClick={() => navigate("/")}>Home</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-link" onClick={() => navigate("/")}>Products</span>
          <span className="breadcrumb-sep">›</span>
          <span>{product.name}</span>
        </div>

        {/* Detail Grid */}
        <div className="detail-grid">
          <div>
            <div className="detail-main-img">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--light-gray)" }}>
                <Icon name="camera" size={72} color="var(--light-gray)" />
                <span style={{ fontSize: 11, letterSpacing: "0.1em" }}>PRODUCT IMAGE</span>
              </div>
            </div>
            <div className="detail-thumbs">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`detail-thumb ${i === 1 ? "active" : ""}`}>
                  <Icon name="camera" size={20} color="var(--light-gray)" />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32 }}>
              <h3 className="section-title" style={{ fontSize: 16 }}>Specifications</h3>
              <table className="spec-table"><tbody>
                {Object.entries(product.specs).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{v}</td></tr>
                ))}
              </tbody></table>
            </div>
          </div>

          <div className="detail-right">
            <div className="brand-badge">{product.brand}</div>
            <h1 className="detail-name">{product.name}</h1>
            <div className="card-tags" style={{ marginBottom: 8 }}>
              {product.best_for.map((t) => <BestForTag key={t} tag={t} />)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <span className={product.stock === "In Stock" ? "stock-in" : "stock-call"}>
                {product.stock === "In Stock" ? "✓ In Stock" : "📞 Call for Availability"}
              </span>
            </div>
            <div className="card-rating" style={{ marginTop: 12 }}>
              <StarRating rating={parseFloat(avgRating)} size={16} />
              <span style={{ fontSize: 15, fontWeight: 500 }}>{avgRating}</span>
              <span style={{ fontSize: 12, color: "var(--mid-gray)" }}>({localReviews.length} reviews)</span>
            </div>
            <div className="detail-price">₹{product.price.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 11, color: "var(--mid-gray)", marginBottom: 4 }}>Inclusive of all taxes · Installation available</div>

            <div className="detail-actions">
              <button className="btn-detail-wa" onClick={() => window.open(`https://wa.me/${siteConfig.whatsappNumber}?text=Hi, I'm interested in the ${product.name}`, "_blank")}>
                <WhatsAppIcon size={16} /> WhatsApp Enquiry
              </button>
              <button className="btn-detail-primary" onClick={() => navigate("/contact")}>
                <Icon name="messageSquare" size={14} color="white" /> Request Quote
              </button>
              <button className="btn-detail-outline" onClick={toggleCompare}>
                {isCompared ? <><Icon name="check" size={14} /> In Comparison</> : <><Icon name="plus" size={14} /> Add to Compare</>}
              </button>
            </div>

            <div style={{ marginTop: 24, background: "var(--off-white)", borderRadius: "var(--radius-md)", padding: "14px 16px", border: "0.5px solid var(--light-gray)" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--mid-gray)", letterSpacing: "0.06em", marginBottom: 8 }}>STORE INFO</div>
              <div style={{ fontSize: 12, color: "var(--dark-gray)", display: "flex", flexDirection: "column", gap: 5 }}>
                <span>📍 {siteConfig.address.line2}</span>
                <span>📞 {siteConfig.phoneNumber}</span>
                <span>🕐 {siteConfig.hours.weekday}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 className="section-title">Related Products</h2>
            <div className="scroll-strip">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} onView={() => { navigate(`/product/${p.id}`); window.scrollTo(0, 0); }} compareList={compareList} onCompare={() => {}} />
              ))}
            </div>
          </div>
        )}

        {/* Matching Bundles */}
        {matchingBundles.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <h2 className="section-title">Available in Packages</h2>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {matchingBundles.map((b) => (
                <div key={b.id} style={{ background: "var(--white)", border: "0.5px solid var(--light-gray)", borderRadius: "var(--radius-md)", padding: "16px 20px", minWidth: 240, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "var(--mid-gray)", marginBottom: 12 }}>{b.components.length} components included</div>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>₹{b.total_price.toLocaleString("en-IN")}</div>
                  <button className="btn-detail-wa" style={{ marginTop: 10, padding: "8px 14px", fontSize: 12 }} onClick={() => window.open(`https://wa.me/${siteConfig.whatsappNumber}?text=Hi, I'm interested in the ${b.name}`, "_blank")}>
                    <WhatsAppIcon size={13} /> Enquire
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div>
          <h2 className="section-title">Customer Reviews</h2>
          <div className="reviews-summary">
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div className="avg-score-num">{avgRating}</div>
              <StarRating rating={parseFloat(avgRating)} size={16} />
              <div className="avg-score-label">{localReviews.length} reviews</div>
            </div>
            <div className="rating-bars">
              {ratingBars.map(({ star, count, pct }) => (
                <div key={star} className="rating-bar-row">
                  <div style={{ display: "flex", gap: 2 }}><StarRating rating={star} size={11} /></div>
                  <div className="rating-bar-track"><div className="rating-bar-fill" style={{ width: `${pct}%` }} /></div>
                  <span className="rating-bar-label">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {localReviews.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px", color: "var(--mid-gray)", fontSize: 14 }}>No reviews yet. Be the first to review!</div>
          ) : (
            localReviews.map((rev) => (
              <div key={rev.id} className="review-card">
                <div className="review-header">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="reviewer-name">{rev.reviewer_name}</span>
                      {rev.is_verified && <span className="verified-badge"><Icon name="check" size={9} color="#27500A" /> Verified Buyer</span>}
                    </div>
                    <StarRating rating={rev.rating} size={12} />
                  </div>
                  <span className="review-date">{timeAgo(rev.created_at)}</span>
                </div>
                <p className="review-text">{rev.review_text}</p>
                <div className="review-helpful">
                  <span>Helpful?</span>
                  <button className="helpful-btn" onClick={() => voteHelpful(rev.id, "helpful_yes")}><Icon name="thumbsUp" size={12} /> {rev.helpful_yes}</button>
                  <button className="helpful-btn" onClick={() => voteHelpful(rev.id, "helpful_no")}><Icon name="thumbsDown" size={12} /> {rev.helpful_no}</button>
                </div>
              </div>
            ))
          )}

          {/* Write Review */}
          <div className="write-review">
            <div className="write-review-title">Write a Review</div>
            <div className="form-field">
              <label className="form-label">Your Name (optional)</label>
              <input className="form-input" placeholder="Your name or Anonymous" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-field">
              <label className="form-label">Rating</label>
              <div className="star-selector">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={`star-btn ${s <= (hoverStar || form.rating) ? "lit" : "dim"}`} onMouseEnter={() => setHoverStar(s)} onMouseLeave={() => setHoverStar(0)} onClick={() => setForm({ ...form, rating: s })}>★</span>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Review</label>
              <textarea className="form-textarea" rows={4} placeholder="Share your experience with this product (min 10 characters)" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value.slice(0, 500) })} />
              <div className="char-count">{form.text.length} / 500</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="btn-submit-review" onClick={submitReview} disabled={submitting}>{submitting ? "Submitting..." : "Submit Review"}</button>
              <span style={{ fontSize: 11, color: "var(--mid-gray)" }}>Reviews appear after approval</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
