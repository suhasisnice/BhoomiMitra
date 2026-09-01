import './states.css';

/* Bars in the shape of the content that is coming, not a spinner — the
   layout stays still and nothing jumps when the data lands. */
export default function Loading({ label = 'Loading', rows = 4, inline = false }) {
  return (
    <div className={inline ? 'skeleton' : 'state'} role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <div className="skeleton" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton__bar" />
        ))}
      </div>
    </div>
  );
}
