import { Link } from 'react-router-dom';
import './layout.css';

/* Page title, an optional line of context, and the actions for the screen.

   `eyebrow` is the breadcrumb pattern every one of the Figma frames uses
   above its title ("CASE MANAGEMENT / TAMIL NADU") — pass an array of
   segments and this joins them. It is where district/state scope now lives,
   not the top nav.

   The hairline under the title stops at 64px instead of running the full
   width — small, specific, and not something an average produces. */
export default function PageHeader({ title, subtitle, actions, back, eyebrow, rule = true }) {
  return (
    <div>
      {back && (
        <Link to={back.to} className="back-link">
          ← {back.label}
        </Link>
      )}
      <div className="page-header">
        <div className="page-header__text">
          {eyebrow && eyebrow.length > 0 && (
            <p className="page-header__eyebrow">{eyebrow.join('  /  ')}</p>
          )}
          <h1 className="page-header__title">{title}</h1>
          {subtitle && <p className="page-header__sub">{subtitle}</p>}
          {rule && <div className="page-header__rule" aria-hidden="true" />}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </div>
  );
}
