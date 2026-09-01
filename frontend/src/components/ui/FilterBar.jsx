import { useId } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import './filterbar.css';

/* The single white filter panel that opens Case List, Audit Trail and Map
   View alike in the frames: a search field, a run of label-over-value
   dropdowns separated by hairlines, then Clear filters and a primary
   Filters button pinned right. One component so the three screens share it
   rather than each inventing a slightly different filter row.

   <FilterBar>
     <FilterBar.Search .../>
     <FilterBar.Select label="District" .../>
     ...
     <FilterBar.Actions onClear={...} hasFilters={...} />
   </FilterBar> */
export default function FilterBar({ children }) {
  return <div className="filterbar">{children}</div>;
}

function FilterSearch({ value, onChange, placeholder, label = 'Search' }) {
  return (
    <div className="filterbar__search">
      <Search size={16} strokeWidth={1.5} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={label}
      />
    </div>
  );
}

/* Looks like a two-line label-over-value control with a chevron, but is a
   real <select> underneath — a sighted user reads the frame's layout, a
   keyboard or screen-reader user still gets a native control. */
function FilterSelect({ label, value, onChange, options, placeholder }) {
  const id = useId();
  const selected = options.find((o) => o.value === value);
  return (
    <div className="filterbar__field">
      <label className="filterbar__field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="filterbar__field-select"
        value={value}
        onChange={onChange}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="filterbar__field-value" aria-hidden="true">
        {selected ? selected.label : placeholder}
      </span>
    </div>
  );
}

function FilterActions({ hasFilters, onClear, filterCount = 0 }) {
  return (
    <div className="filterbar__actions">
      {hasFilters && (
        <button type="button" className="filterbar__clear" onClick={onClear}>
          <X size={14} strokeWidth={1.75} aria-hidden="true" />
          Clear filters
        </button>
      )}
      <span className="filterbar__count" aria-hidden="true">
        <SlidersHorizontal size={14} strokeWidth={1.75} aria-hidden="true" />
        {filterCount > 0 ? `${filterCount} active` : 'Filters'}
      </span>
    </div>
  );
}

FilterBar.Search = FilterSearch;
FilterBar.Select = FilterSelect;
FilterBar.Actions = FilterActions;
