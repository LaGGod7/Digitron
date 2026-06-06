import { Icon, WhatsAppIcon, StarRating, BestForTag, ImagePlaceholder } from "../ui";
import siteConfig from "../../data/siteConfig";

export default function ProductCard({ product, onView, compareList, onCompare }) {
  const isSelected = compareList.some((p) => p.id === product.id);

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

  return (
    <div className="product-card" onClick={() => onView(product)}>
      <div className="card-img-wrap">
        <ImagePlaceholder label={product.category} />
        <span className="card-brand-badge">{product.brand}</span>
        <button
          className={`card-compare-btn ${isSelected ? "selected" : ""}`}
          onClick={handleCompare}
          title="Add to compare"
        >
          {isSelected ? (
            <Icon name="check" size={12} color="white" />
          ) : (
            <Icon name="plus" size={12} color="currentColor" />
          )}
        </button>
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
        <div className="card-price">₹{product.price.toLocaleString("en-IN")}</div>
        <div className="card-rating">
          <StarRating rating={product.avg_rating} />
          <span className="rating-num">{product.avg_rating}</span>
          <span className="rating-count">({product.review_count} reviews)</span>
        </div>
        <div className="card-actions">
          <button className="btn-view-details">View Details</button>
          <button className="btn-wa-card" onClick={handleWhatsApp} title="WhatsApp Enquiry">
            <WhatsAppIcon size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
