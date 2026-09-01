import { api, qs } from './client';

/* Sub-resources are flat query routes, not nested under /cases/{id}. */
export function forCase(caseId, opts) {
  return api.get(`/parcels${qs({ case_id: caseId })}`, opts);
}

export function get(parcelId, opts) {
  return api.get(`/parcels/${parcelId}`, opts);
}

/* GeoJSON FeatureCollection for the map, refetched as the viewport moves. */
export function bbox({ minLon, minLat, maxLon, maxLat, status }, opts) {
  return api.get(
    `/parcels/bbox${qs({
      min_lon: minLon,
      min_lat: minLat,
      max_lon: maxLon,
      max_lat: maxLat,
      parcel_status: status,
    })}`,
    opts,
  );
}

export function search(surveyNumber, limit, opts) {
  return api.get(`/parcels/search${qs({ survey_number: surveyNumber, limit })}`, opts);
}

/* Register a parcel where it stands. Coordinates come from the device;
   the backend validates them against real WGS84 bounds, because a phone
   with no fix reports (0, 0) and that is in the Atlantic. */
export function create(payload, opts) {
  return api.post('/parcels', payload, opts);
}

/* Longitude and latitude move together or not at all — sending one alone is
   refused, because it would place the parcel on a line through the original
   point rather than obviously nowhere. */
export function update(parcelId, payload, opts) {
  return api.patch(`/parcels/${parcelId}`, payload, opts);
}
