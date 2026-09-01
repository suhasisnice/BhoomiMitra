import './ui.css';

/* A tinted pill carrying a dot and a word. Never colour alone: some judges
   are colour blind and some rooms have terrible projectors. CLAUDE.md 3.3. */
export default function Badge({ tone = 'idle', children, title }) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      <span className="badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}
