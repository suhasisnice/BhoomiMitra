import { Link } from 'react-router-dom';
import './ui.css';

/* Filled, never outlined or ghost. No icons inside. No shadow, no scale on
   hover — hover moves the fill one step and that is the whole vocabulary. */
export default function Button({
  variant = 'primary',
  size,
  block,
  to,
  href,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size ? `btn--${size}` : '',
    block ? 'btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
