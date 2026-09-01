import './states.css';

/* An empty result is not a failure, and should not read as one. Where the
   emptiness has a reason — a filter that matches nothing, a stage that has
   not been reached yet — say the reason. */
export default function Empty({ title = 'Nothing here yet', body, action, center = false }) {
  return (
    <div className={center ? 'state state--center' : 'state'}>
      <p className="state__title">{title}</p>
      {body && <p className="state__body">{body}</p>}
      {action}
    </div>
  );
}
