export default function DigitronLoader({ label = "loading", compact = false }) {
  return (
    <div className={`digitron-loader ${compact ? "compact" : ""}`} role="status" aria-live="polite">
      <div className="digitron-loader-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="digitron-loader-word" aria-hidden="true">
        DIGITRON
        <span>DIGITRON</span>
      </div>
      <div className="digitron-loader-meta">
        <span>{label}</span>
        <span className="digitron-loader-dots">...</span>
      </div>
      <div className="digitron-loader-progress" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
