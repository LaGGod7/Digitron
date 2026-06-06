import { useState, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DigitronLoader, Icon, WhatsAppIcon, StarRating, BestForTag } from "../components/ui";
import { Footer, ProductCard } from "../components/layout";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProductById, fetchProducts, submitReview, updateReview } from '../services/api';
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import bundles from "../data/bundles";
import siteConfig from "../data/siteConfig";

export default function ProductDetailPage({ compareList, setCompareList, showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, login } = useAuth();
  const { addToCart } = useCart();

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProductById(id)
  });

  const { data: productPool = [] } = useQuery({
    queryKey: ['product-detail-similar-products'],
    queryFn: () => fetchProducts(null, null, false, { limit: 1000 }),
    enabled: Boolean(product)
  });

  const mutation = useMutation({
    mutationFn: (newReview) => submitReview(newReview),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      setForm({ rating: 0, text: "" });
      showToast("Review submitted successfully!");
    },
    onError: () => showToast("Error submitting review. Try again.")
  });

  const editMutation = useMutation({
    mutationFn: ({ reviewId, data }) => updateReview(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      setEditingReviewId(null);
      showToast("Review updated successfully!");
    },
    onError: () => showToast("Error updating review. Try again.")
  });

  const [form, setForm] = useState({ rating: 0, text: "" });
  const [hoverStar, setHoverStar] = useState(0);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 0, text: "" });
  const [editHoverStar, setEditHoverStar] = useState(0);
  const [activeSpecTab, setActiveSpecTab] = useState("specs");

  const reviewsEnabled = typeof window !== 'undefined' ? localStorage.getItem('ae_enable_reviews') !== 'false' : true;

  const related = useMemo(() => {
    if (!product) return [];

    return productPool
      .filter((candidate) => candidate.id !== product.id)
      .map((candidate) => {
        const sharedBestFor = (candidate.best_for || []).filter((tag) => product.best_for?.includes(tag)).length;
        const score =
          (candidate.category === product.category ? 6 : 0) +
          (candidate.type === product.type ? 3 : 0) +
          (candidate.brand === product.brand ? 2 : 0) +
          sharedBestFor;

        return { ...candidate, similarityScore: score };
      })
      .filter((candidate) => candidate.similarityScore > 0)
      .sort((a, b) => b.similarityScore - a.similarityScore || (b.avg_rating || 0) - (a.avg_rating || 0))
      .slice(0, 8);
  }, [product, productPool]);

  if (isLoading) {
    return (
      <div className="page">
        <DigitronLoader label="loading details" />
      </div>
    );
  }

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

  const localReviews = product.reviews || [];
  const avgRating = product.avg_rating || 0;
  const ratingBars = [5, 4, 3, 2, 1].map((star) => ({ star, count: localReviews.filter((r) => r.rating === star).length, pct: localReviews.length > 0 ? Math.round((localReviews.filter((r) => r.rating === star).length / localReviews.length) * 100) : 0 }));

  const handleSubmitReview = () => {
    if (form.rating === 0) { showToast("Please select a star rating"); return; }
    if (form.text.length < 10) { showToast("Review must be at least 10 characters"); return; }
    mutation.mutate({
      productId: product.id,
      rating: form.rating,
      reviewText: form.text
    });
  };

  const handleAddToCart = async () => {
    if (!user) {
      showToast("Login to add products to cart");
      login(location.pathname + location.search);
      return;
    }
    try {
      await addToCart(product.id);
      showToast("Added to cart!");
    } catch {
      showToast("Could not add to cart. Try again.");
    }
  };

  const voteHelpful = (reviewId, field) => {
    // Helpful votes can be local or backend; let's keep it local for now or skip
  };

  const isCompared = compareList.some((p) => p.id === product.id);
  const toggleCompareProduct = (selectedProduct) => {
    const alreadyCompared = compareList.some((p) => p.id === selectedProduct.id);
    if (alreadyCompared) setCompareList(compareList.filter((p) => p.id !== selectedProduct.id));
    else if (compareList.length < 2) { setCompareList([...compareList, selectedProduct]); showToast("Added to comparison"); }
    else showToast("Max 2 products. Remove one first.");
  };
  const toggleCompare = () => toggleCompareProduct(product);

  const timeAgo = (dateStr) => {
    const days = Math.floor((new Date() - new Date(dateStr)) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  const matchingBundles = bundles.filter((b) => b.best_for.some((bf) => product.best_for.includes(bf)));
  const priceLabel = product.price > 0 ? `Rs. ${product.price.toLocaleString("en-IN")}` : "Price on request";
  const overviewSpecs = {
    Brand: product.brand,
    Category: product.category,
    Type: product.type,
    Resolution: product.resolution,
    "Indoor/Outdoor": product.indoor_outdoor,
    Availability: product.stock,
  };
  const inventorySpecs = {
    "Product ID": product.id,
    Barcode: product.barcode || "-",
    GST: product.gst || "-",
    "Stock Quantity": product.stock_qty ?? "-",
    MRP: priceLabel,
  };
  const activeSpecs = activeSpecTab === "overview" ? overviewSpecs : activeSpecTab === "inventory" ? inventorySpecs : (product.specs || { "Note": "Detailed specifications not available for this model yet." });

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
        <div className="detail-grid detail-hero-panel">
          <div>
            <div className="detail-main-img" style={{ backgroundColor: "#ffffff", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", position: "relative" }}>
              <span className="detail-image-badge">{product.category}</span>
              {product.images && product.images[0] && product.images[0] !== "product" ? (
                <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "24px", position: "absolute", inset: 0 }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "var(--light-gray)", position: "relative", zIndex: 1 }}>
                  <Icon name="camera" size={72} color="var(--light-gray)" />
                  <span style={{ fontSize: 11, letterSpacing: "0.1em" }}>PRODUCT IMAGE</span>
                </div>
              )}
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
              <div className="spec-tabs">
                {[
                  ["overview", "Overview"],
                  ["specs", "Detailed Specifications"],
                  ["inventory", "Inventory"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={`spec-tab ${activeSpecTab === key ? "active" : ""}`}
                    onClick={() => setActiveSpecTab(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <table className="spec-table"><tbody>
                {Object.entries(activeSpecs).map(([k, v]) => (
                  <tr key={k}><td>{k}</td><td>{v}</td></tr>
                ))}
              </tbody></table>
            </div>
          </div>

          <div className="detail-right">
            <div className="brand-badge">{product.brand}</div>
            <h1 className="detail-name">{product.name}</h1>
            <div className="detail-meta-grid">
              <div>
                <span>Resolution</span>
                <strong>{product.resolution || "Other"}</strong>
              </div>
              <div>
                <span>Use</span>
                <strong>{product.indoor_outdoor || "Indoor"}</strong>
              </div>
              <div>
                <span>Type</span>
                <strong>{product.type || "Product"}</strong>
              </div>
            </div>
            <div className="card-tags" style={{ marginBottom: 8 }}>
              {product.best_for.map((t) => <BestForTag key={t} tag={t} />)}
            </div>
            <div style={{ marginBottom: 8 }}>
              <span className={product.stock === "In Stock" ? "stock-in" : "stock-call"}>
                {product.stock === "In Stock" ? "✓ In Stock" : "📞 Call for Availability"}
              </span>
            </div>
            {reviewsEnabled && (
              <div className="card-rating" style={{ marginTop: 12 }}>
                <StarRating rating={parseFloat(avgRating)} size={16} />
                <span style={{ fontSize: 15, fontWeight: 500 }}>{avgRating}</span>
                <span style={{ fontSize: 12, color: "var(--mid-gray)" }}>({localReviews.length} reviews)</span>
              </div>
            )}
            <div className={`detail-price ${product.price === 0 ? "quote-price" : ""}`}>{priceLabel}</div>
            <div style={{ fontSize: 11, color: "var(--mid-gray)", marginBottom: 4 }}>GST: {product.gst || "Contact shop"} · Installation available</div>

            <div className="detail-actions">
              <button className="btn-detail-wa" onClick={() => window.open(`https://wa.me/${siteConfig.whatsappNumber}?text=Hi, I'm interested in the ${product.name}`, "_blank")}>
                <WhatsAppIcon size={16} /> WhatsApp Enquiry
              </button>
              <button className="btn-detail-primary" onClick={() => navigate("/contact")}>
                <Icon name="messageSquare" size={14} color="white" /> Request Quote
              </button>
              <button className="btn-detail-primary" onClick={handleAddToCart}>
                <Icon name="shoppingCart" size={14} color="white" /> Add to Cart
              </button>
              <button className="btn-detail-outline" onClick={toggleCompare}>
                {isCompared ? <><Icon name="check" size={14} /> In Comparison</> : <><Icon name="plus" size={14} /> Add to Compare</>}
              </button>
            </div>

            <div className="detail-service-card">
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
          <div className="similar-products-section">
            <div className="section-heading-row">
              <div>
                <h2 className="section-title">Similar Products</h2>
                <p>More options that match this category, use case, or brand.</p>
              </div>
              <button className="section-link-btn" onClick={() => navigate(`/category/${product.category?.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`)}>
                View category <Icon name="chevronRight" size={13} />
              </button>
            </div>
            <div className="scroll-strip">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} onView={() => { navigate(`/product/${p.id}`); window.scrollTo(0, 0); }} compareList={compareList} onCompare={toggleCompareProduct} />
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
        {reviewsEnabled && (
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
              localReviews.map((rev) => {
                const isMyReview = user && rev.customerId === user.id;
                return (
                  <div key={rev.id} className="review-card">
                    <div className="review-header">
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="reviewer-name">{rev.reviewer_name}</span>
                          {rev.is_verified && <span className="verified-badge"><Icon name="check" size={9} color="#27500A" /> Verified Buyer</span>}
                          {isMyReview && !editingReviewId && (
                            <button 
                              onClick={() => {
                                setEditingReviewId(rev.id);
                                setEditForm({ rating: rev.rating, text: rev.review_text });
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--gold-dark)',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: 'var(--off-white)',
                                marginLeft: '8px'
                              }}
                            >
                              <Icon name="edit" size={10} /> Edit
                            </button>
                          )}
                        </div>
                        <StarRating rating={rev.rating} size={12} />
                      </div>
                      <span className="review-date">{timeAgo(rev.created_at)}</span>
                    </div>
                    {editingReviewId === rev.id ? (
                      <div style={{ marginTop: '10px', background: 'var(--off-white)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--light-gray)' }}>
                        <div className="form-field" style={{ marginBottom: '10px' }}>
                          <label className="form-label">Rating</label>
                          <div className="star-selector">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span 
                                key={s} 
                                className={`star-btn ${s <= (editHoverStar || editForm.rating) ? "lit" : "dim"}`} 
                                onMouseEnter={() => setEditHoverStar(s)} 
                                onMouseLeave={() => setEditHoverStar(0)} 
                                onClick={() => setEditForm({ ...editForm, rating: s })}
                                style={{ fontSize: '18px' }}
                              >★</span>
                            ))}
                          </div>
                        </div>
                        <div className="form-field" style={{ marginBottom: '12px' }}>
                          <label className="form-label">Your Review</label>
                          <textarea 
                            className="form-textarea" 
                            rows={3} 
                            value={editForm.text} 
                            onChange={(e) => setEditForm({ ...editForm, text: e.target.value.slice(0, 500) })} 
                            style={{ background: 'var(--white)', fontSize: '12px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn-submit-review" 
                            onClick={() => {
                              if (editForm.rating === 0) { showToast("Please select a rating"); return; }
                              if (editForm.text.length < 10) { showToast("Review must be at least 10 characters"); return; }
                              editMutation.mutate({ reviewId: rev.id, data: { rating: editForm.rating, reviewText: editForm.text } });
                            }}
                            disabled={editMutation.isPending}
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                          >
                            {editMutation.isPending ? "Saving..." : "Save"}
                          </button>
                          <button 
                            className="helpful-btn" 
                            onClick={() => setEditingReviewId(null)}
                            style={{ padding: '6px 14px', fontSize: '12px', background: 'transparent' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="review-text">{rev.review_text}</p>
                        <div className="review-helpful">
                          <span>Helpful?</span>
                          <button className="helpful-btn" onClick={() => voteHelpful(rev.id, "helpful_yes")}><Icon name="thumbsUp" size={12} /> {rev.helpful_yes}</button>
                          <button className="helpful-btn" onClick={() => voteHelpful(rev.id, "helpful_no")}><Icon name="thumbsDown" size={12} /> {rev.helpful_no}</button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}

            {/* Write Review */}
            <div className="write-review">
              <div className="write-review-title">Write a Review</div>
              {user ? (
                <>
              <div className="form-field">
                <label className="form-label">Your Name</label>
                <input className="form-input" value={user.name} readOnly />
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
                <button className="btn-submit-review" onClick={handleSubmitReview} disabled={mutation.isPending}>{mutation.isPending ? "Submitting..." : "Submit Review"}</button>
                <span style={{ fontSize: 11, color: "var(--mid-gray)" }}>Reviews are published instantly!</span>
              </div>
                </>
              ) : (
                <div className="login-review-gate">
                  <Icon name="user" size={28} color="var(--gold-dark)" />
                  <div>
                    <strong>Please login to submit a review</strong>
                    <p>Your review will be linked to your Google profile.</p>
                  </div>
                  <button className="btn-submit-review" onClick={() => login(location.pathname + location.search)}>Login with Google</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
