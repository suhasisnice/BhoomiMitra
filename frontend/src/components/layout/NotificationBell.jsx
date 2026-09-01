import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import * as notificationsApi from '../../api/notifications';
import './layout.css';

/* The unread count in the top bar.

   It asks for the count, not the list: fifty rows to render one integer is
   the sort of thing that is invisible in a demo and expensive in a district
   office on a bad connection.

   Refetched on every navigation and once a minute otherwise. A minute is not
   about freshness — these rules run nightly — but about the case where an
   officer deals with something in another tab and comes back to a badge that
   still says three. */
const POLL_MS = 60000;

export default function NotificationBell() {
  const [count, setCount] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    function load() {
      notificationsApi
        .unreadCount({ signal: controller.signal })
        .then((data) => {
          if (active) setCount(data.unread_count);
        })
        .catch(() => {
          /* Swallowed on purpose. A badge that cannot load is a badge that
             shows nothing; it is not a reason to put an error on a page the
             person opened to do something else. */
        });
    }

    load();
    const timer = setInterval(load, POLL_MS);

    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [location.pathname]);

  const unread = count || 0;

  return (
    <NavLink
      to="/notifications"
      className={({ isActive }) => `bell${isActive ? ' is-active' : ''}`}
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
    >
      <Bell size={17} strokeWidth={1.5} aria-hidden="true" />
      {unread > 0 && (
        <span className="bell__count" aria-hidden="true">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </NavLink>
  );
}
