import Icon from "./Icon";

export default function Toast({ message }) {
  return (
    <div className="toast">
      <Icon name="check" size={14} color="var(--gold)" />
      {message}
    </div>
  );
}
