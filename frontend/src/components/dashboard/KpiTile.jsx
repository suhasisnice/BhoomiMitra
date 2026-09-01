import './dashboard.css';

/* One KPI. `value` is already formatted by lib/format — this component does
   no formatting of its own, so a rupee figure cannot end up rendered one way
   here and another way in a table.

   `of` and `meter` are optional: a figure that is genuinely a proportion
   (paid of awarded, acquired of notified) shows both halves, because the
   numerator alone is not the fact anyone needs.

   `accent` and `icon` are the treatment the Case List frame uses: a coloured
   left edge plus a tinted icon badge, both keyed off one of the palette's
   real semantic tones rather than an arbitrary colour — 'neutral' (the
   default, the near-black/tan pair) reads as a plain count, the status
   tones read as what they mean everywhere else in the product. */
const ACCENT_ICON_BG = {
  neutral: 'var(--brand-tint)',
  ok: 'var(--ok-bg)',
  warn: 'var(--warn-bg)',
  danger: 'var(--danger-bg)',
  info: 'var(--info-bg)',
};
const ACCENT_ICON_COLOR = {
  neutral: 'var(--text)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};
const ACCENT_BAR = {
  neutral: 'var(--text)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  danger: 'var(--danger)',
  info: 'var(--info)',
};

export default function KpiTile({
  label,
  value,
  unit,
  of,
  meter,
  split,
  accent,
  icon: Icon,
}) {
  return (
    <div
      className={`kpi${accent ? ' kpi--accented' : ''}`}
      style={
        accent
          ? { '--kpi-accent': ACCENT_BAR[accent], '--kpi-icon-bg': ACCENT_ICON_BG[accent], '--kpi-icon-color': ACCENT_ICON_COLOR[accent] }
          : undefined
      }
    >
      {Icon && (
        <div className="kpi__icon" aria-hidden="true">
          <Icon size={20} strokeWidth={1.75} />
        </div>
      )}
      <p className="kpi__label">{label}</p>

      <p className="kpi__value">
        {value}
        {unit && <span className="kpi__unit">{unit}</span>}
      </p>

      {of && <p className="kpi__of">{of}</p>}

      {meter !== null && meter !== undefined && (
        <div
          className="kpi__meter"
          role="img"
          aria-label={`${meter}% complete`}
        >
          <div
            className={`kpi__meter-fill${
              meter < 34 ? ' is-danger' : meter < 67 ? ' is-warn' : ''
            }`}
            style={{ width: `${Math.min(100, Math.max(0, meter))}%` }}
          />
        </div>
      )}

      {split && (
        <div className="kpi__split">
          {split.map((item) => (
            <span key={item.label}>
              <b>{item.value}</b> {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
