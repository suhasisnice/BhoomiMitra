import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as casesApi from '../api/cases';
import * as parcelsApi from '../api/parcels';
import * as personsApi from '../api/persons';
import * as documentsApi from '../api/documents';
import * as objectionsApi from '../api/objections';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth/AuthContext';
import { can, isLandowner } from '../auth/permissions';
import * as fmt from '../lib/format';
import { docTypeLabel, stageLabel } from '../lib/labels';
import PageHeader from '../components/layout/PageHeader';
import StageTimeline from '../components/case/StageTimeline';
import StatusBadge from '../components/case/StatusBadge';
import AdvanceStageModal from '../components/case/AdvanceStageModal';
import CompensationModal from '../components/case/CompensationModal';
import RnrModal from '../components/case/RnrModal';
import RespondObjectionModal from '../components/case/RespondObjectionModal';
import UploadDocumentModal from '../components/case/UploadDocumentModal';
import AddPersonModal from '../components/case/AddPersonModal';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Loading from '../components/states/Loading';
import ErrorState from '../components/states/ErrorState';
import Empty from '../components/states/Empty';
import '../components/case/case.css';

/* Header, stage timeline, parcels, people, documents, objections, audit.

   Six independent requests rather than one: each panel shows its own loading
   and error state, so a slow documents call does not hold up the timeline,
   and a 403 on the audit trail (which a landowner cannot read) leaves the
   rest of the page intact. */
export default function CaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [modal, setModal] = useState(null);

  const detail = useApi((opts) => casesApi.get(caseId, opts), [caseId]);
  const parcels = useApi((opts) => parcelsApi.forCase(caseId, opts), [caseId]);
  const people = useApi((opts) => personsApi.forCase(caseId, opts), [caseId]);
  const documents = useApi((opts) => documentsApi.forCase(caseId, opts), [caseId]);
  const missing = useApi((opts) => documentsApi.missing(caseId, opts), [caseId]);
  const objections = useApi((opts) => objectionsApi.forCase(caseId, opts), [caseId]);
  /* A five-row preview — the full trail now lives at its own /audit route
     (the Figma "Audit Trail" frame is a standalone page with its own
     filters and case-context sidebar, not a panel), so this only needs to
     answer "has anything happened recently". */
  const audit = useApi((opts) => casesApi.audit(caseId, 5, opts), [caseId], {
    skip: !can.readAudit(user),
  });

  function refreshAll() {
    detail.reload();
    people.reload();
    documents.reload();
    missing.reload();
    objections.reload();
    audit.reload();
  }

  if (detail.loading) return <Loading label="Loading the case" rows={10} />;
  if (detail.error) {
    return (
      <>
        <PageHeader
          title="Case"
          back={{
            to: '/cases',
            label: isLandowner(user) ? 'My acquisition' : 'All cases',
          }}
        />
        <ErrorState error={detail.error} onRetry={detail.reload} />
      </>
    );
  }

  const c = detail.data;

  return (
    <>
      <PageHeader
        back={{
          to: '/cases',
          label: isLandowner(user) ? 'My acquisition' : 'All cases',
        }}
        title={c.title}
        subtitle={`${c.village_name}, ${c.district_name} · ${c.project_name}`}
        actions={
          <>
            <Button variant="quiet" onClick={() => window.print()}>
              Print
            </Button>
            {can.advanceStage(user) && c.allowed_next_stages.length > 0 && (
              <Button variant="primary" onClick={() => setModal({ kind: 'advance' })}>
                Advance stage
              </Button>
            )}
          </>
        }
      />

      <div className="case-title-row">
        <span className="case-number">{c.case_number}</span>
        <StatusBadge kind="case" value={c.status} />
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          Opened {fmt.date(c.created_at)}
        </span>
      </div>

      <div className="case-detail">
        <div className="case-detail__main">
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Statutory progress</h2>
              <span className="panel__count">{stageLabel(c.stage)}</span>
            </div>
            <StageTimeline
              stage={c.stage}
              history={c.stage_history}
              stalledDays={c.days_in_stage}
            />
          </section>

          <PeoplePanel
            state={people}
            user={user}
            onEditCompensation={(person) => setModal({ kind: 'compensation', person })}
            onEditRnr={(person) => setModal({ kind: 'rnr', person })}
            onAdd={() => setModal({ kind: 'person' })}
          />

          <ParcelsPanel state={parcels} onOpen={(id) => navigate(`/parcels/${id}`)} />

          <ObjectionsPanel
            state={objections}
            user={user}
            onRespond={(objection) => setModal({ kind: 'objection', objection })}
          />
        </div>

        <div className="case-detail__side">
          <FactsPanel c={c} />
          <MissingDocumentsPanel state={missing} />
          <DocumentsPanel
            state={documents}
            user={user}
            onUpload={() => setModal({ kind: 'upload' })}
          />
          {can.readAudit(user) && <AuditPanel state={audit} caseId={caseId} />}
        </div>
      </div>

      {modal && modal.kind === 'advance' && (
        <AdvanceStageModal
          caseRecord={c}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            refreshAll();
          }}
        />
      )}
      {modal && modal.kind === 'compensation' && (
        <CompensationModal
          person={modal.person}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            people.reload();
          }}
        />
      )}
      {modal && modal.kind === 'rnr' && (
        <RnrModal
          person={modal.person}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            people.reload();
          }}
        />
      )}
      {modal && modal.kind === 'objection' && (
        <RespondObjectionModal
          objection={modal.objection}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            objections.reload();
            audit.reload();
          }}
        />
      )}
      {modal && modal.kind === 'upload' && (
        <UploadDocumentModal
          caseId={c.id}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            documents.reload();
            missing.reload();
          }}
        />
      )}
      {modal && modal.kind === 'person' && (
        <AddPersonModal
          caseRecord={c}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            people.reload();
          }}
        />
      )}
    </>
  );
}

function FactsPanel({ c }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">The acquisition</h2>
      </div>
      <div className="facts">
        <div>
          <p className="fact__label">PARCELS</p>
          <p className="fact__value">
            <strong>{fmt.count(c.parcel_count)}</strong>
          </p>
        </div>
        <div>
          <p className="fact__label">TOTAL AREA</p>
          <p className="fact__value">
            <strong>{fmt.hectaresPlain(c.total_area_ha)}</strong> ha
          </p>
        </div>
        <div>
          <p className="fact__label">IN STAGE</p>
          <p className="fact__value">
            <span className={c.days_in_stage >= 10 ? 'is-overdue' : undefined}>
              {fmt.days(c.days_in_stage)}
            </span>
          </p>
        </div>
        <div>
          <p className="fact__label">SINCE</p>
          <p className="fact__value">{fmt.date(c.stage_changed_at)}</p>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <p className="fact__label">VILLAGE</p>
          <p className="fact__value">
            {c.village_name}, {c.district_name}
          </p>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <p className="fact__label">PROJECT</p>
          <p className="fact__value">{c.project_name}</p>
        </div>
      </div>
    </section>
  );
}

/* Compensation and R&R are two columns, never one. A person with no land
   title shows an em dash under compensation and a live entitlement under
   R&R — that row is the whole point of the screen. */
function PeoplePanel({ state, user, onEditCompensation, onEditRnr, onAdd }) {
  const editComp = can.editCompensation(user);
  const editRnr = can.editRnr(user);

  const columns = [
    {
      key: 'name',
      header: 'Affected household',
      sortable: true,
      render: (row) => (
        <span className="person-name">
          <span className="person-name__title">{row.name}</span>
          <span className="person-name__meta">
            {row.village_name}
            {' · '}
            {row.has_land_title ? 'Title holder' : 'No land title'}
            {row.parcel_count > 0 &&
              ` · ${row.parcel_count} parcel${row.parcel_count === 1 ? '' : 's'}, ${fmt.hectaresPlain(row.total_area_ha)} ha`}
          </span>
        </span>
      ),
    },
    {
      key: 'compensation',
      header: 'Compensation',
      width: '186px',
      render: (row) =>
        row.compensation ? (
          <span className="track">
            <StatusBadge kind="compensation" value={row.compensation.status} />
            <span className="track__amount">
              {fmt.rupeesPlain(row.compensation.amount_paid)} of{' '}
              {fmt.rupeesPlain(row.compensation.amount_awarded)}
            </span>
          </span>
        ) : (
          /* No compensation record means one of two different things, and
             conflating them misstates the household's position: a titled
             owner of acquired land is simply waiting on the award, while a
             household with no parcels here is never going to receive one. */
          <span className="track__none">
            {row.parcel_count > 0
              ? 'Award not yet made'
              : 'No land acquired from this household'}
          </span>
        ),
    },
    {
      key: 'rnr',
      header: 'Rehabilitation & Resettlement',
      width: '208px',
      render: (row) =>
        row.rnr ? (
          <span className="track">
            <StatusBadge kind="rnr" value={row.rnr.status} />
            {row.rnr.entitlement && (
              <span className="person-name__meta">{row.rnr.entitlement}</span>
            )}
          </span>
        ) : (
          <span className="track__none">No entitlement recorded</span>
        ),
    },
  ];

  if (editComp || editRnr) {
    columns.push({
      key: 'actions',
      header: '',
      width: '132px',
      render: (row) => (
        <span style={{ display: 'flex', gap: 'var(--s3)' }}>
          {editComp && row.compensation && (
            <Button
              variant="link"
              onClick={(event) => {
                event.stopPropagation();
                onEditCompensation(row);
              }}
            >
              Compensation
            </Button>
          )}
          {editRnr && row.rnr && (
            <Button
              variant="link"
              onClick={(event) => {
                event.stopPropagation();
                onEditRnr(row);
              }}
            >
              R&amp;R
            </Button>
          )}
        </span>
      ),
    });
  }

  return (
    <section className="panel panel--table">
      <div className="panel__head">
        <h2 className="panel__title">Affected families</h2>
        <span className="panel__count panel__count--split">
          {state.data
            ? `${state.data.landowner_count} with title · ${state.data.landless_count} without`
            : ''}
          {can.addPerson(user) && (
            <Button variant="link" onClick={onAdd}>
              Add household
            </Button>
          )}
        </span>
      </div>

      {state.loading && <div style={{ padding: 'var(--s5)' }}><Loading inline rows={4} /></div>}
      {state.error && <div style={{ padding: 'var(--s5)' }}><ErrorState error={state.error} onRetry={state.reload} /></div>}
      {state.data && (
        <DataTable
          columns={columns}
          rows={state.data.items}
          getRowKey={(row) => row.person_id}
          empty={
            <Empty
              center
              title="No households recorded"
              body="Affected families are added once the land verification identifies who lives on and works the parcels."
            />
          }
          caption={
            state.data.items.length
              ? 'Compensation follows land title. Resettlement follows displacement, and is owed whether or not a household holds title.'
              : undefined
          }
        />
      )}
    </section>
  );
}

function ParcelsPanel({ state, onOpen }) {
  const columns = [
    {
      key: 'survey_number',
      header: 'Survey no.',
      width: '116px',
      sortable: true,
      render: (row) => <span className="case-number">{row.survey_number}</span>,
    },
    { key: 'owner_name', header: 'Recorded owner', sortable: true },
    {
      key: 'area_ha',
      header: 'Area (ha)',
      width: '104px',
      align: 'num',
      sortable: true,
      render: (row) => fmt.hectaresPlain(row.area_ha),
    },
    {
      key: 'status',
      header: 'Status',
      width: '164px',
      sortable: true,
      render: (row) => <StatusBadge kind="parcel" value={row.status} />,
    },
  ];

  return (
    <section className="panel panel--table">
      <div className="panel__head">
        <h2 className="panel__title">Parcels</h2>
        <span className="panel__count">{state.data ? `${state.data.length}` : ''}</span>
      </div>

      {state.loading && <div style={{ padding: 'var(--s5)' }}><Loading inline rows={3} /></div>}
      {state.error && <div style={{ padding: 'var(--s5)' }}><ErrorState error={state.error} onRetry={state.reload} /></div>}
      {state.data && (
        <DataTable
          columns={columns}
          rows={state.data}
          getRowKey={(row) => row.id}
          onRowClick={(row) => onOpen(row.id)}
          empty={<Empty center title="No parcels attached yet" />}
        />
      )}
    </section>
  );
}

/* Knows which documents this stage legally requires and which are absent —
   one of the five things that make the product unmistakably this product. */
function MissingDocumentsPanel({ state }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Required at this stage</h2>
        {state.data && (
          /* How many of the documents THIS stage requires are on file — not
             how many documents the case holds. `present` also lists papers
             filed for earlier stages, so counting it directly produced
             "2 of 1" the moment a case moved to a stage requiring less. */
          <span className="panel__count">
            {state.data.required.filter((d) => state.data.present.includes(d)).length} of{' '}
            {state.data.required.length}
          </span>
        )}
      </div>

      {state.loading && <Loading inline rows={3} />}
      {state.error && <ErrorState error={state.error} onRetry={state.reload} />}

      {state.data && (
        <div className="missing-docs">
          {state.data.required.length === 0 && (
            <Empty title="Nothing required" body="This stage prescribes no documents." />
          )}
          {state.data.required.map((docType) => {
            const present = state.data.present.includes(docType);
            return (
              <div
                key={docType}
                className={`missing-doc ${present ? 'is-present' : 'is-missing'}`}
              >
                <span className="missing-doc__mark" aria-hidden="true" />
                <span className="missing-doc__name">{docTypeLabel(docType)}</span>
                <span className="missing-doc__state">{present ? 'Filed' : 'Missing'}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DocumentsPanel({ state, user, onUpload }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Documents</h2>
        {can.uploadDocument(user) && (
          <Button variant="link" onClick={onUpload}>
            Upload
          </Button>
        )}
      </div>

      {state.loading && <Loading inline rows={3} />}
      {state.error && <ErrorState error={state.error} onRetry={state.reload} />}

      {state.data && (
        <>
          {state.data.items.length === 0 && (
            <Empty
              title="Nothing filed yet"
              body="Documents uploaded against this case appear here in the order they were filed."
            />
          )}
          <div className="missing-docs">
            {state.data.items.map((doc) => (
              <div key={doc.id} className="missing-doc is-present">
                <span className="missing-doc__mark" aria-hidden="true" />
                <span className="missing-doc__name">
                  {docTypeLabel(doc.doc_type)}
                  <br />
                  <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                    {doc.filename} · {fmt.date(doc.uploaded_on)}
                  </span>
                </span>
                <Button
                  variant="link"
                  onClick={() => documentsApi.download(doc.id, doc.filename)}
                >
                  Open
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ObjectionsPanel({ state, user, onRespond }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Objections</h2>
        {state.data && (
          <span className="panel__count">
            {state.data.open_count} open
            {state.data.overdue_count > 0 && (
              <span className="is-overdue"> · {state.data.overdue_count} overdue</span>
            )}
          </span>
        )}
      </div>

      {state.loading && <Loading inline rows={3} />}
      {state.error && <ErrorState error={state.error} onRetry={state.reload} />}

      {state.data && state.data.items.length === 0 && (
        <Empty
          title="No objections filed"
          body="Objections filed under Section 15 during the objection period appear here, with the officer's response."
        />
      )}

      {state.data &&
        state.data.items.map((objection) => (
          <article key={objection.id} className="objection">
            <div className="objection__head">
              <span className="objection__who">{objection.person_name}</span>
              <span style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'baseline' }}>
                <StatusBadge kind="objection" value={objection.status} />
                <span className={`objection__when${objection.is_overdue ? ' is-overdue' : ''}`}>
                  Filed {fmt.date(objection.filed_on)}
                  {objection.days_open !== null && objection.days_open !== undefined
                    ? ` · ${fmt.days(objection.days_open)} open`
                    : ''}
                </span>
              </span>
            </div>

            <p className="objection__grounds">{objection.grounds}</p>

            {objection.response && (
              <div className="objection__response">
                <span className="objection__response-label">
                  RESPONSE · {fmt.date(objection.responded_on)}
                </span>
                {objection.response}
              </div>
            )}

            {can.respondToObjection(user) && !objection.response && (
              <div className="objection__actions">
                <Button variant="secondary" size="sm" onClick={() => onRespond(objection)}>
                  Record response
                </Button>
              </div>
            )}
          </article>
        ))}
    </section>
  );
}

/* A five-entry preview. The full trail — with search, event-type and
   date-range filters, and a case-context sidebar — lives at its own
   /cases/:caseId/audit route, matching the Figma "Audit Trail" frame's own
   standalone page rather than an embedded panel. */
function AuditPanel({ state, caseId }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Audit trail</h2>
        <Link to={`/cases/${caseId}/audit`} className="panel__view-all">
          View full trail
        </Link>
      </div>

      {state.loading && <Loading inline rows={4} />}
      {state.error && <ErrorState error={state.error} onRetry={state.reload} />}

      {state.data && state.data.items.length === 0 && (
        <Empty title="No recorded activity" />
      )}

      {state.data && (
        <div className="audit">
          {state.data.items.map((entry) => (
            <div key={entry.id} className="audit__row">
              <span className="audit__when">{fmt.dateTime(entry.created_at)}</span>
              <span className="audit__what">
                {entry.action}
                <br />
                <span className="audit__who">{entry.user_name || 'System'}</span>
                {entry.detail && (
                  <>
                    {' · '}
                    <span className="audit__detail">{entry.detail}</span>
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
