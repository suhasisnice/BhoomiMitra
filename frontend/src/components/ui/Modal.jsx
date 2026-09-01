import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button';
import './ui.css';

/* The one modal in the product. Escape closes it, focus moves into it on
   open and returns to the trigger on close, and Tab is trapped inside while
   it is open — without that a keyboard user tabs into the page behind and
   cannot find their way back. */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  error,
  busy,
}) {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    returnFocusRef.current = document.activeElement;

    const panel = panelRef.current;
    const focusable = () =>
      Array.from(
        panel.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    const first = focusable()[0];
    if (first) first.focus();
    else panel.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape' && !busy) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusable();
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (returnFocusRef.current && returnFocusRef.current.focus) {
        returnFocusRef.current.focus();
      }
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal__scrim"
      onMouseDown={(event) => {
        // Only a click that both starts and ends on the scrim dismisses.
        // Otherwise a drag that began inside a textarea closes the dialog
        // and throws away what was typed.
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="modal__head">
          <h2 className="modal__title" id="modal-title">
            {title}
          </h2>
          {subtitle && <p className="modal__sub">{subtitle}</p>}
        </div>

        <div className="modal__body">
          {error && (
            <p className="modal__error" role="alert">
              {error.message || String(error)}
            </p>
          )}
          {children}
        </div>

        <div className="modal__foot">
          {footer || (
            <Button variant="quiet" onClick={onClose} disabled={busy}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
