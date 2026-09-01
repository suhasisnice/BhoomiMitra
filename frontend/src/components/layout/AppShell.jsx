import { NavLink, Link } from 'react-router-dom';
import {
  FileBarChart,
  FileText,
  Inbox,
  LayoutDashboard,
  Map,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { can, isLandowner, isRequiringBody } from '../../auth/permissions';
import { roleLabel } from '../../lib/labels';
import Button from '../ui/Button';
import NotificationBell from './NotificationBell';
import './layout.css';

/* Top nav, current user and role, logout. Every page behind auth renders
   inside this. Rebuilt to the Figma "Case List" frame's app-shell chrome —
   a horizontal bar, not the sidebar this used to be. White, not the public
   pages' mauve: CLAUDE.md's two-register rule already drew this line
   (public = generous and serif, application = a working tool), the frames
   just settled the literal values.

   The navigation genuinely differs by role rather than showing the same
   links to everyone and refusing on click: a landowner has no Dashboard and
   no Map, because neither is theirs to see.

   It is built from what the signed-in role may do rather than from a list
   per role. Nine roles against three hardcoded lists is how a state officer
   ends up with no dashboard — the list nobody updated wins over the
   permission that says they read across districts. Each entry names the
   capability that puts it there, so adding a role to a capability in
   permissions.js is enough and the nav follows. */

function buildNav(user) {
  const items = [];

  if (can.viewDashboard(user)) {
    items.push({ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard });
  }

  /* A landowner has one acquisition, not a caseload, and the label should
     not pretend otherwise. A requiring body sees the cases its own
     sanctioned proposals became. */
  items.push({
    to: '/cases',
    label: isLandowner(user) ? 'My acquisition' : 'Case list',
    icon: FileText,
  });

  if (can.viewProposals(user)) {
    items.push({ to: '/proposals', label: 'Proposals', icon: Inbox });
  }

  /* The map is a caseload tool. A landowner's single parcel does not need
     one, and a requiring body has no field role. */
  if (can.viewDashboard(user)) {
    items.push({ to: '/map', label: 'Parcel map', icon: Map });
  }

  if (!isRequiringBody(user)) {
    items.push({
      to: '/objections',
      label: isLandowner(user) ? 'My objections' : 'Objections',
      icon: Megaphone,
    });
  }

  if (can.viewReports(user)) {
    items.push({ to: '/reports', label: 'Reports', icon: FileBarChart });
  }

  return items;
}

/* "S. Karthikeyan" -> "SK". Falls back to the first two letters of a single
   word rather than blanking the avatar for a one-word name. */
function initials(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const nav = buildNav(user);

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="topnav">
        <Link to={nav.length ? nav[0].to : '/cases'} className="topnav__brand">
          <span className="topnav__wordmark">BHOOMIMITRA</span>
          <span className="topnav__tagline">Empowering Land. Enabling Progress.</span>
        </Link>

        <nav className="topnav__links" aria-label="Main">
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `topnav__link${isActive ? ' is-active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="topnav__right">
          {user && <NotificationBell />}
          <div className="topnav__who">
            <span className="topnav__name">{user ? user.full_name : ''}</span>
            <span className="topnav__role">{user ? roleLabel(user.role) : ''}</span>
          </div>
          <div className="topnav__avatar" aria-hidden="true">
            {user ? initials(user.full_name) : ''}
          </div>
          <Button variant="quiet" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="page" id="main">
        {children}
      </main>
    </div>
  );
}
