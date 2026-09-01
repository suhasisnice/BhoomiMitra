import { Link } from 'react-router-dom';
import './public.css';

/* Mauve bar, wordmark in heavy serif caps hard against the left margin,
   two links at the right. The caps here and the sentence case in the footer
   are deliberately different — see design/README.md. */
export default function PublicHeader() {
  return (
    <header className="public-header">
      <Link to="/" className="public-header__brand">
        BHOOMIMITRA
      </Link>
      <nav className="public-header__nav" aria-label="Public">
        <Link to="/notices" className="public-header__link">
          Notices
        </Link>
        <Link to="/login" className="public-header__link">
          Sign in
        </Link>
        <Link to="/signup" className="public-header__link">
          Register
        </Link>
      </nav>
    </header>
  );
}
