const tagStyles = {
  Home: { cls: "tag-home", icon: "🏠" },
  Shop: { cls: "tag-shop", icon: "🏪" },
  Parking: { cls: "tag-parking", icon: "🅿️" },
};

export default function BestForTag({ tag }) {
  const style = tagStyles[tag] || { cls: "tag-shop", icon: "📍" };
  return (
    <span className={`tag ${style.cls}`}>
      {style.icon} {tag}
    </span>
  );
}
