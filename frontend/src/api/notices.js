import { api, qs } from './client';

/* The only unauthenticated endpoint the app calls. A public notice is
   public: publication under Sections 11 and 19 is a statutory requirement,
   and a notice behind a login has not been published. */
export function list(params, opts) {
  return api.get(`/notices${qs(params)}`, opts);
}

/* The authenticated register: which statutory instruments a case has had
   published. Distinct from the public board above, which is deliberately
   narrow and carries no officer names. */
export function register(caseId, opts) {
  return api.get(`/notices/register${qs({ case_id: caseId })}`, opts);
}

export function issue(payload, opts) {
  return api.post('/notices/register', payload, opts);
}
