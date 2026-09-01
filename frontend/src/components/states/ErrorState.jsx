import Button from '../ui/Button';
import './states.css';

/* One error presentation for the whole product. The message comes from
   client.js, which has already normalised whatever shape the API sent. */
export default function ErrorState({ error, onRetry, title }) {
  const message =
    (error && error.message) || 'Something went wrong while loading this.';
  const code = error && error.code;

  return (
    <div className="state state--error" role="alert">
      <div className="state__error-mark" aria-hidden="true" />
      <div className="state__error-body">
        <p className="state__title">{title || 'This could not be loaded'}</p>
        <p className="state__body">{message}</p>
        {code && <p className="state__code">{code}</p>}
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
