import Icon from "./Icon";

export default function ImagePlaceholder({ label = "Camera" }) {
  return (
    <div className="card-img-placeholder">
      <Icon name="camera" size={40} color="var(--light-gray)" className="card-img-icon" />
      <span>{label}</span>
    </div>
  );
}
