import { useMemo, useState } from 'react';
import Empty from '../states/Empty';
import './ui.css';

/* Built once, used on five screens.

   columns: [{
     key, header, align: 'num'|undefined, sortable, width,
     render: (row) => node,       // defaults to row[key]
     sortValue: (row) => scalar,  // defaults to row[key]
   }]

   Sorting is client-side and applies to the page in hand. That is honest for
   the case list, where the server already ordered and paged the result: the
   header says "sort these rows", not "sort all 52". */
export default function DataTable({
  columns,
  rows,
  getRowKey,
  onRowClick,
  isRowFlagged,
  caption,
  empty,
  initialSort,
}) {
  const [sort, setSort] = useState(initialSort || null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;

    const value = column.sortValue || ((row) => row[column.key]);
    const direction = sort.direction === 'desc' ? -1 : 1;

    return [...rows].sort((a, b) => {
      const av = value(a);
      const bv = value(b);
      if (av === bv) return 0;
      // Nulls sort last in both directions: an empty cell is not a small
      // value, it is an absent one, and burying it at the top of an ascending
      // sort hides the rows that do have data.
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * direction;
      return String(av).localeCompare(String(bv), 'en-IN') * direction;
    });
  }, [rows, sort, columns]);

  function toggleSort(key) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  }

  if (!rows.length) {
    return <div className="table-wrap">{empty || <Empty center />}</div>;
  }

  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort && sort.key === column.key;
                return (
                  <th
                    key={column.key}
                    className={column.align === 'num' ? 'num' : undefined}
                    style={column.width ? { width: column.width } : undefined}
                    aria-sort={
                      active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        className="table__sort"
                        onClick={() => toggleSort(column.key)}
                      >
                        {column.header}
                        <span className="table__sort-mark" aria-hidden="true">
                          {active ? (sort.direction === 'asc' ? '▲' : '▼') : '◇'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, index) => {
              const key = getRowKey ? getRowKey(row) : index;
              const clickable = Boolean(onRowClick);
              return (
                <tr
                  key={key}
                  className={[
                    clickable ? 'is-clickable' : '',
                    isRowFlagged && isRowFlagged(row) ? 'is-flagged' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  role={clickable ? 'button' : undefined}
                  onKeyDown={
                    clickable
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((column) => (
                    <td key={column.key} className={column.align === 'num' ? 'num' : undefined}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {caption && <p className="table__caption">{caption}</p>}
    </div>
  );
}
