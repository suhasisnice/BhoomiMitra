import { Link } from 'react-router-dom';
import { Instagram, Linkedin, Twitter } from 'lucide-react';
import './public.css';

/* Mauve footer: sentence-case wordmark, one line of description, thin social
   icons, three link columns. */

const COLUMNS = [
  {
    heading: 'The process',
    links: [
      { label: 'Public notices', to: '/notices' },
      { label: 'Filing an objection', to: '/notices' },
      { label: 'Compensation and R&R', to: '/notices' },
    ],
  },
  {
    heading: 'The Act',
    links: [
      { label: 'RFCTLARR 2013', to: '/notices' },
      { label: 'Second Schedule', to: '/notices' },
      { label: 'Social impact assessment', to: '/notices' },
    ],
  },
  {
    heading: 'Offices',
    links: [
      { label: 'District Collector', to: '/login' },
      { label: 'Land acquisition officer', to: '/login' },
      { label: 'Grievance redressal', to: '/notices' },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__rule" aria-hidden="true" />
      <div className="public-footer__cols">
        <div>
          <p className="public-footer__brand">Bhoomimitra</p>
          <p className="public-footer__tagline">
            A transparent, people-centred platform that makes every step of land
            acquisition clearer, fairer, and more accountable.
          </p>
          <div className="public-footer__social">
            <a href="/" aria-label="Instagram">
              <Instagram size={17} strokeWidth={1.5} />
            </a>
            <a href="/" aria-label="LinkedIn">
              <Linkedin size={17} strokeWidth={1.5} />
            </a>
            <a href="/" aria-label="X">
              <Twitter size={17} strokeWidth={1.5} />
            </a>
          </div>
        </div>

        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="public-footer__heading">{column.heading}</p>
            <div className="public-footer__links">
              {column.links.map((link) => (
                <Link key={link.label} to={link.to}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
