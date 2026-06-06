import { Icon, WhatsAppIcon, StarRating, BestForTag, ImagePlaceholder, Tooltip } from "../ui";
import siteConfig from "../../data/siteConfig";

export default function ProductCard({ product, onView, compareList, onCompare, onAddToCart, onToggleWishlist, isWishlisted = false }) {
  const isSelected = compareList.some((p) => p.id === product.id);
  const priceLabel = product.price > 0 ? `Rs. ${product.price.toLocaleString("en-IN")}` : "Price on request";

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    window.open(
      `https://wa.me/${siteConfig.whatsappNumber}?text=Hi, I'm interested in the ${product.name}`,
      "_blank"
    );
  };

  const handleCompare = (e) => {
    e.stopPropagation();
    onCompare(product);
  };

  const handleWishlist = (e) => {
    e.stopPropagation();
    onToggleWishlist?.(product);
  };

  const handleCart = (e) => {
    e.stopPropagation();
    onAddToCart?.(product);
  };

  return (
    <div className="product-card" onClick={() => onView(product)}>
      <div className="card-img-wrap" style={{ backgroundColor: "#ffffff", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
        {product.images && product.images[0] && product.images[0] !== "product" ? (
          <img src={product.images[0]} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain", padding: "16px" }} />
        ) : (
          <ImagePlaceholder label={product.category} />
        )}
        <span className="card-brand-badge">{product.brand}</span>
        <Tooltip content={isSelected ? "Remove from compare" : "Add to compare"}>
          <button
            className={`card-compare-btn ${isSelected ? "selected" : ""}`}
            onClick={handleCompare}
            aria-label="Compare"
          >
            {isSelected ? (
              <Icon name="check" size={12} color="white" />
            ) : (
              <Icon name="plus" size={12} color="currentColor" />
            )}
          </button>
        </Tooltip>
        {onToggleWishlist && (
          <Tooltip content={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}>
            <button
              className={`card-wishlist-btn ${isWishlisted ? "selected" : ""}`}
              onClick={handleWishlist}
              aria-label="Save to wishlist"
            >
              <Icon name="heart" size={13} color="currentColor" />
            </button>
          </Tooltip>
        )}
      </div>
      <div className="card-body">
        <div className="card-name">{product.name}</div>
        <div className="card-tags">
          {product.best_for.map((t) => (
            <BestForTag key={t} tag={t} />
          ))}
        </div>
        <div className="card-spec">
          {product.resolution} · {product.type} · {product.indoor_outdoor}
        </div>
        <div className={`card-price ${product.price === 0 ? "quote-price" : ""}`}>{priceLabel}</div>
        <div className="card-price-sub">{product.stock_qty > 0 ? `${product.stock_qty} available` : "Contact shop for availability"}</div>
        <div className="card-rating">
          <StarRating rating={product.avg_rating} />
          <span className="rating-num">{product.avg_rating}</span>
          <span className="rating-count">({product.review_count} reviews)</span>
        </div>
        <div className="card-actions">
          <button className="btn-view-details">View Details</button>
          {onAddToCart && (
            <button className="btn-cart-card" onClick={handleCart}>
              <Icon name="shoppingCart" size={14} /> Add
            </button>
          )}
          <Tooltip content="WhatsApp Enquiry">
            <button className="btn-wa-card" onClick={handleWhatsApp} aria-label="WhatsApp Enquiry">
              <WhatsAppIcon size={15} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
