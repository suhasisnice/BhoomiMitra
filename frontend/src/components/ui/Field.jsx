import { useId } from 'react';
import './ui.css';

/* Every input has a real label, wired by id. Errors are per-field and sit
   under the control, and the control is marked aria-invalid so a screen
   reader hears the problem too. */

function Wrapper({ id, label, error, hint, children }) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children(describedBy || undefined)}
      {hint && !error && (
        <span className="field__hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function Input({ label, error, hint, id: providedId, ...rest }) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint}>
      {(describedBy) => (
        <input
          id={id}
          className="field__control"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </Wrapper>
  );
}

export function Textarea({ label, error, hint, id: providedId, ...rest }) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint}>
      {(describedBy) => (
        <textarea
          id={id}
          className="field__control"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      )}
    </Wrapper>
  );
}

/* options: [{value, label}]. `placeholder` becomes an empty-value option,
   which is how "any district" is expressed on a filter bar. */
export function Select({ label, error, hint, options = [], placeholder, id: providedId, ...rest }) {
  const generatedId = useId();
  const id = providedId || generatedId;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint}>
      {(describedBy) => (
        <select
          id={id}
          className="field__control"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Wrapper>
  );
}
