import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import * as parcelsApi from '../api/parcels';
import { useEnums } from '../hooks/useEnums';
import { parcelStatusLabel } from '../lib/labels';
import * as fmt from '../lib/format';
import PageHeader from '../components/layout/PageHeader';
import FilterBar from '../components/ui/FilterBar';
import Button from '../components/ui/Button';
import ErrorState from '../components/states/ErrorState';
import '../components/map/map.css';

/* Built to the Figma "Map View" frame's illustrated style — flat basemap,
   hand-drawn-looking parcel shapes, a legend and a selected-parcel sidebar —
   in place of the real OpenStreetMap tiles the previous build used.

   That trade was made deliberately (see the conversation this replaced
   Leaflet in) and it costs something real: there was never a survey
   boundary to draw. A parcel has only ever had a point (lon, lat), on this
   build and the last one — /parcels/bbox returns a coordinate, not a
   polygon. So "illustrated style" here means the DATA stays real (the
   point, the survey number, the owner, the status, the case) while the
   SHAPE drawn around that point is a deterministic decorative polygon sized
   by the parcel's real area — seeded by the parcel's id so it is stable
   across re-renders, not a fabricated survey line. Nothing about a parcel's
   position, count, or attributes is invented; only its outline is drawn
   rather than surveyed. */

const STATUS_COLOUR = {
  notified: 'var(--idle)',
  under_acquisition: 'var(--warn)',
  acquired: 'var(--ok)',
  possession_taken: 'var(--info)',
};

const CANVAS_W = 1000;
const CANVAS_H = 640;

/* Karnataka, where the seeded districts are — only the opening view. */
const INITIAL_BBOX = { west: 76.85, south: 12.55, east: 77.85, north: 13.55 };
const MIN_SPAN = 0.02;
const MAX_SPAN = 6;

function lon2x(lon, bbox) {
  return ((lon - bbox.west) / (bbox.east - bbox.west)) * CANVAS_W;
}
function lat2y(lat, bbox) {
  // Screen y grows downward; latitude grows northward (upward).
  return ((bbox.north - lat) / (bbox.north - bbox.south)) * CANVAS_H;
}

/* A tiny seeded PRNG (mulberry32) so a parcel's decorative shape is the same
   on every render and every reload — not reshuffled each time the viewport
   refetches. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* An irregular 6-point polygon around (cx, cy), radius driven by real area —
   larger holdings draw visibly larger, not just differently numbered. */
function parcelShape(cx, cy, areaHa, seed) {
  const rand = seededRandom(seed);
  const baseRadius = Math.min(46, Math.max(16, 12 + Math.sqrt(Math.max(areaHa, 0.05)) * 11));
  const points = [];
  const sides = 6;
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 + rand() * 0.5;
    const radius = baseRadius * (0.78 + rand() * 0.4);
    points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
  }
  return points.join(' ');
}

export default function MapView() {
  const navigate = useNavigate();
  const { parcel_statuses: statuses } = useEnums();

  const [bbox, setBbox] = useState(INITIAL_BBOX);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [features, setFeatures] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const requestRef = useRef(0);
  const svgRef = useRef(null);
  const drag = useRef(null);

  const load = useCallback(async (box, parcelStatus) => {
    const id = ++requestRef.current;
    setLoading(true);
    try {
      const data = await parcelsApi.bbox({
        minLon: box.west,
        minLat: box.south,
        maxLon: box.east,
        maxLat: box.north,
        status: parcelStatus || undefined,
      });
      if (id !== requestRef.current) return;
      setFeatures(data.features || []);
      setError(null);
    } catch (err) {
      if (id !== requestRef.current || err.name === 'AbortError') return;
      setError(err);
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, []);

  /* Reload whenever the viewport or status filter settles — not on every
     drag pixel, only when the drag or a zoom step ends. */
  const reload = useCallback(
    (nextBbox) => {
      const box = nextBbox || bbox;
      load(box, status);
    },
    [bbox, status, load],
  );

  useEffect(() => {
    // Runs once per mount; subsequent loads are explicit, from pan/zoom/status.
    load(INITIAL_BBOX, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onStatusChange(value) {
    setStatus(value);
    load(bbox, value);
  }

  function zoom(factor) {
    const spanLon = (bbox.east - bbox.west) * factor;
    const spanLat = (bbox.north - bbox.south) * factor;
    if (spanLon < MIN_SPAN || spanLon > MAX_SPAN) return;
    const cx = (bbox.east + bbox.west) / 2;
    const cy = (bbox.north + bbox.south) / 2;
    const next = {
      west: cx - spanLon / 2,
      east: cx + spanLon / 2,
      south: cy - spanLat / 2,
      north: cy + spanLat / 2,
    };
    setBbox(next);
    reload(next);
  }

  function onPointerDown(event) {
    drag.current = { x: event.clientX, y: event.clientY, bbox, latest: bbox };
  }
  function onPointerMove(event) {
    if (!drag.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dxPx = event.clientX - drag.current.x;
    const dyPx = event.clientY - drag.current.y;
    const start = drag.current.bbox;
    const spanLon = start.east - start.west;
    const spanLat = start.north - start.south;
    const dLon = -(dxPx / rect.width) * spanLon;
    const dLat = (dyPx / rect.height) * spanLat;
    const next = {
      west: start.west + dLon,
      east: start.east + dLon,
      south: start.south + dLat,
      north: start.north + dLat,
    };
    /* Kept on the ref as well as in state: mouseup reads it from here, not
       from the `bbox` closure. A drag that ends before React has committed
       the last mousemove would otherwise refetch for the frame before the
       one the user actually let go on, and the map would sit slightly off
       from where they dragged until the next interaction. Refs are
       synchronous, so there is no ordering to get wrong. */
    drag.current.latest = next;
    setBbox(next);
  }
  function onPointerUp() {
    if (!drag.current) return;
    const settled = drag.current.latest;
    drag.current = null;
    reload(settled);
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return features;
    return features.filter((f) => {
      const p = f.properties;
      return p.survey_number.toLowerCase().includes(q) || p.owner_name.toLowerCase().includes(q);
    });
  }, [features, search]);

  const counts = useMemo(() => {
    const tally = {};
    for (const feature of features) {
      const key = feature.properties.status;
      tally[key] = (tally[key] || 0) + 1;
    }
    return tally;
  }, [features]);

  return (
    <>
      <PageHeader
        eyebrow={['Parcel map', 'National']}
        title="Map View"
        subtitle="Explore land parcels and their acquisition status. Drag to pan, use +/- to zoom."
      />

      <FilterBar>
        <FilterBar.Search
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by survey number or owner…"
        />
        <FilterBar.Select
          label="Status"
          value={status}
          placeholder="All statuses"
          options={statuses.map((value) => ({ value, label: parcelStatusLabel(value) }))}
          onChange={(event) => onStatusChange(event.target.value)}
        />
        <FilterBar.Actions
          hasFilters={Boolean(status || search)}
          filterCount={[status, search].filter(Boolean).length}
          onClear={() => {
            setSearch('');
            onStatusChange('');
          }}
        />
      </FilterBar>

      {error && <ErrorState error={error} title="The map could not load parcels" />}

      <div className="map-shell">
        <div className="map-frame">
          <svg
            ref={svgRef}
            className="map-canvas"
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
          >
            <rect width={CANVAS_W} height={CANVAS_H} className="map-canvas__ground" />
            {/* Purely decorative texture — no claim to any real road, river
                or settlement. Real geography left with the tiles when this
                page moved to the illustrated style. */}
            <g className="map-canvas__texture" aria-hidden="true">
              {Array.from({ length: 24 }, (_, i) => {
                const rand = seededRandom(i * 97 + 3);
                return (
                  <circle
                    key={i}
                    cx={rand() * CANVAS_W}
                    cy={rand() * CANVAS_H}
                    r={3 + rand() * 4}
                  />
                );
              })}
            </g>

            {visible.map((feature) => {
              const [lon, lat] = feature.geometry.coordinates;
              const p = feature.properties;
              const cx = lon2x(lon, bbox);
              const cy = lat2y(lat, bbox);
              if (cx < -60 || cx > CANVAS_W + 60 || cy < -60 || cy > CANVAS_H + 60) return null;
              const isSelected = selected && selected.properties.id === p.id;
              return (
                <g
                  key={p.id}
                  className={`map-parcel${isSelected ? ' is-selected' : ''}`}
                  onClick={() => setSelected(feature)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Parcel ${p.survey_number}`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setSelected(feature);
                  }}
                >
                  <polygon
                    points={parcelShape(cx, cy, p.area_ha, p.id)}
                    style={{ fill: STATUS_COLOUR[p.status] || STATUS_COLOUR.notified }}
                  />
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                    {p.survey_number}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="map-zoom">
            <button type="button" onClick={() => zoom(1 / 1.5)} aria-label="Zoom in">
              <Plus size={16} strokeWidth={2} />
            </button>
            <button type="button" onClick={() => zoom(1.5)} aria-label="Zoom out">
              <Minus size={16} strokeWidth={2} />
            </button>
          </div>

          {loading && <span className="map-loading">Loading…</span>}
        </div>

        <aside className="map-side">
          {selected ? (
            <div className="map-selected">
              <p className="map-selected__label">Selected parcel</p>
              <dl>
                <div>
                  <dt>Survey No.</dt>
                  <dd className="case-number">{selected.properties.survey_number}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{selected.properties.owner_name}</dd>
                </div>
                <div>
                  <dt>Area</dt>
                  <dd>{fmt.hectares(selected.properties.area_ha)}</dd>
                </div>
                <div>
                  <dt>Linked case</dt>
                  <dd>{selected.properties.case_number}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{parcelStatusLabel(selected.properties.status)}</dd>
                </div>
              </dl>
              <Button
                variant="primary"
                block
                onClick={() => navigate(`/parcels/${selected.properties.id}`)}
              >
                View details
              </Button>
            </div>
          ) : (
            <p className="map-hint">Select a parcel on the map to see its details here.</p>
          )}

          <div>
            <p className="fact__label" style={{ marginBottom: 'var(--s3)' }}>
              IN VIEW {loading ? '· loading' : `· ${features.length}`}
            </p>
            <div className="legend">
              {(statuses.length ? statuses : Object.keys(STATUS_COLOUR)).map((value) => (
                <span key={value} className="legend__item">
                  <span
                    className="legend__swatch"
                    style={{ background: STATUS_COLOUR[value] }}
                    aria-hidden="true"
                  />
                  {parcelStatusLabel(value)}
                  <span className="legend__count">{counts[value] || 0}</span>
                </span>
              ))}
            </div>
          </div>

          <p className="map-hint">
            Parcels load for the area on screen. Zoom out far enough and the count
            in view is capped — narrow the area or filter by status to see a
            complete picture.
          </p>
        </aside>
      </div>
    </>
  );
}
