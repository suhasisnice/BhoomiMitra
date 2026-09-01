import { useParams } from 'react-router-dom';
import * as parcelsApi from '../api/parcels';
import * as casesApi from '../api/cases';
import { useApi } from '../hooks/useApi';
import * as fmt from '../lib/format';
import { stageLabel } from '../lib/labels';
import PageHeader from '../components/layout/PageHeader';
import StatusBadge from '../components/case/StatusBadge';
import Button from '../components/ui/Button';
import Loading from '../components/states/Loading';
import ErrorState from '../components/states/ErrorState';
import '../components/case/case.css';

/* Survey number, recorded owner, area, and the case it belongs to.

   Reached from the map popup and from the parcels table on a case. Small on
   purpose — everything else about this land lives on the case, and this page
   links there rather than reproducing it. */
export default function ParcelDetail() {
  const { parcelId } = useParams();

  const parcel = useApi((opts) => parcelsApi.get(parcelId, opts), [parcelId]);

  const linkedCase = useApi(
    (opts) => casesApi.get(parcel.data.case_id, opts),
    [parcel.data && parcel.data.case_id],
    { skip: !parcel.data },
  );

  if (parcel.loading) return <Loading label="Loading the parcel" rows={6} />;
  if (parcel.error) {
    return (
      <>
        <PageHeader title="Parcel" back={{ to: '/map', label: 'Parcel map' }} />
        <ErrorState error={parcel.error} onRetry={parcel.reload} />
      </>
    );
  }

  const p = parcel.data;

  return (
    <>
      <PageHeader
        back={{ to: '/map', label: 'Parcel map' }}
        title={`Survey number ${p.survey_number}`}
        subtitle="One parcel of land within an acquisition."
        actions={
          <Button to={`/cases/${p.case_id}`} variant="primary">
            Open the case
          </Button>
        }
      />

      <div className="case-detail case-detail--balanced">
        <div className="case-detail__main">
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">The parcel</h2>
              <StatusBadge kind="parcel" value={p.status} />
            </div>

            <div className="facts">
              <div>
                <p className="fact__label">SURVEY NUMBER</p>
                <p className="fact__value">
                  <span className="case-number">{p.survey_number}</span>
                </p>
              </div>
              <div>
                <p className="fact__label">AREA</p>
                <p className="fact__value">
                  <strong>{fmt.hectaresPlain(p.area_ha)}</strong> ha
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="fact__label">RECORDED OWNER</p>
                <p className="fact__value">{p.owner_name}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p className="fact__label">LOCATION</p>
                <p className="fact__value" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="case-detail__side">
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">The acquisition</h2>
            </div>

            {linkedCase.loading && <Loading inline rows={3} />}
            {linkedCase.error && (
              <ErrorState error={linkedCase.error} onRetry={linkedCase.reload} />
            )}

            {linkedCase.data && (
              <div className="facts">
                <div style={{ gridColumn: '1 / -1' }}>
                  <p className="fact__label">CASE</p>
                  <p className="fact__value">
                    <span className="case-number">{linkedCase.data.case_number}</span>
                    <br />
                    {linkedCase.data.title}
                  </p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p className="fact__label">STAGE</p>
                  <p className="fact__value">{stageLabel(linkedCase.data.stage)}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p className="fact__label">VILLAGE</p>
                  <p className="fact__value">
                    {linkedCase.data.village_name}, {linkedCase.data.district_name}
                  </p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p className="fact__label">PROJECT</p>
                  <p className="fact__value">{linkedCase.data.project_name}</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
