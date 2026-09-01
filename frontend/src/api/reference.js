import { api, qs } from './client';

/* Districts, villages and projects back every filter dropdown and the
   create-case form. They live at the API root, not under /reference. */

export function districts(opts) {
  return api.get('/districts', opts);
}

export function villages(districtId, opts) {
  return api.get(`/villages${qs({ district_id: districtId })}`, opts);
}

export function projects(districtId, opts) {
  return api.get(`/projects${qs({ district_id: districtId })}`, opts);
}

/* States and Union Territories, with district and case counts. The list the
   national scope selector is built from. */
export function states(opts) {
  return api.get('/states', opts);
}
