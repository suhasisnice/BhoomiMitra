import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as dashboardApi from '../api/dashboard';
import * as referenceApi from '../api/reference';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth/AuthContext';
import * as fmt from '../lib/format';
import { ruleLabel, severityLabel, stageLabel } from '../lib/labels';
import PageHeader from '../components/layout/PageHeader';
import KpiTile from '../components/dashboard/KpiTile';
import StatusBadge from '../components/case/StatusBadge';
import DataTable from '../components/ui/DataTable';
import { Select } from '../components/ui/Field';
import Loading from '../components/states/Loading';
import ErrorState from '../components/states/ErrorState';
import Empty from '../components/states/Empty';
import '../components/dashboard/dashboard.css';

/* Five KPI tiles, an alerts panel with clickable rows, and the nine stages
   in statutory order.

   The five figures are fixed by the problem statement: area notified vs
   acquired, compensation awarded vs paid, affected families, R&R completion,
   and possession. Each one shows both halves of its ratio, because "₹4.82 Cr
   awarded" without "₹3.11 Cr paid" is the number that hides the problem. */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [districtId, setDistrictId] = useState('');
  const [severity, setSeverity] = useState('');

  const districts = useApi(
    (opts) => referenceApi.districts(opts),
    [],
    // A district-scoped officer sees one district and cannot change it; the
    // filter would be a dropdown with a single option.
    { skip: user && user.role !== 'admin' },
  );

  const scope = useMemo(
    () => ({ district_id: districtId || undefined }),
    [districtId],
  );

  const kpis = useApi((opts) => dashboardApi.kpis(scope, opts), [districtId]);
  const alerts = useApi(
    (opts) => dashboardApi.alerts({ ...scope, severity: severity || undefined, limit: 50 }, opts),
    [districtId, severity],
  );
  const stages = useApi((opts) => dashboardApi.casesByStage(opts), []);

  const districtOptions = (districts.data || []).map((d) => ({
    value: String(d.id),
    label: d.name,
  }));

  const alertColumns = [
    {
      key: 'severity',
      header: 'Severity',
      width: '108px',
      render: (row) => <StatusBadge kind="severity" value={row.severity} />,
      sortable: true,
      sortValue: (row) => ['low', 'medium', 'high', 'critical'].indexOf(row.severity),
    },
    {
      key: 'case_number',
      header: 'Case',
      width: '160px',
      sortable: true,
      render: (row) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{row.case_number}</span>,
    },
    {
      key: 'rule',
      header: 'Finding',
      width: '190px',
      sortable: true,
      render: (row) => ruleLabel(row.rule),
    },
    { key: 'message', header: 'Detail', render: (row) => row.message },
    {
      key: 'stage',
      header: 'Stage',
      width: '170px',
      sortable: true,
      render: (row) => <span style={{ color: 'var(--text-muted)' }}>{stageLabel(row.stage)}</span>,
    },
    {
      key: 'detected_on',
      header: 'Raised',
      width: '104px',
      sortable: true,
      render: (row) => fmt.date(row.detected_on),
    },
  ];

  return (
    <>
      <PageHeader
        title="Acquisition overview"
        subtitle={
          user && user.role === 'admin'
            ? 'Every district, as it stands today.'
            : 'Your district, as it stands today.'
        }
        actions={
          districtOptions.length > 1 ? (
            <div style={{ minWidth: 200 }}>
              <Select
                label="District"
                value={districtId}
                placeholder="All districts"
                options={districtOptions}
                onChange={(event) => setDistrictId(event.target.value)}
              />
            </div>
          ) : null
        }
      />

      {kpis.loading && <Loading label="Loading the figures" rows={5} />}
      {kpis.error && <ErrorState error={kpis.error} onRetry={kpis.reload} />}
      {kpis.data && <Kpis data={kpis.data} />}

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">What needs attention</h2>
          <div style={{ minWidth: 180 }}>
            <Select
              label="Severity"
              value={severity}
              placeholder="All severities"
              options={['critical', 'high', 'medium', 'low'].map((value) => ({
                value,
                label: severityLabel(value),
              }))}
              onChange={(event) => setSeverity(event.target.value)}
            />
          </div>
        </div>

        {alerts.loading && <Loading label="Loading alerts" rows={6} />}
        {alerts.error && <ErrorState error={alerts.error} onRetry={alerts.reload} />}

        {alerts.data && (
          <>
            {alerts.data.total > 0 && (
              <p className="alert-summary" style={{ marginBottom: 'var(--s3)' }}>
                {Object.entries(alerts.data.by_severity || {})
                  .filter(([, n]) => n > 0)
                  .map(([key, n]) => (
                    <span key={key}>
                      <b>{n}</b> {severityLabel(key).toLowerCase()}
                    </span>
                  ))}
              </p>
            )}

            <DataTable
              columns={alertColumns}
              rows={alerts.data.items}
              getRowKey={(row) => row.id}
              onRowClick={(row) => navigate(`/cases/${row.case_id}`)}
              isRowFlagged={(row) => row.severity === 'critical'}
              initialSort={{ key: 'severity', direction: 'desc' }}
              caption={
                alerts.data.items.length
                  ? 'Raised by the rules engine on its last run. Select a row to open the case.'
                  : undefined
              }
              empty={
                <Empty
                  center
                  title="Nothing is overdue"
                  body={
                    severity
                      ? 'No findings at this severity. Clear the filter to see the rest.'
                      : 'No case in scope has tripped a rule. This is the state you want at a rehearsal, and it also means the rules have run.'
                  }
                />
              }
            />
          </>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Where cases stand</h2>
          <span className="section__count">
            {stages.data
              ? `${fmt.count(stages.data.reduce((sum, s) => sum + s.case_count, 0))} cases`
              : ''}
          </span>
        </div>

        {stages.loading && <Loading label="Loading the stage breakdown" rows={9} />}
        {stages.error && <ErrorState error={stages.error} onRetry={stages.reload} />}
        {stages.data && <StageBars rows={stages.data} onPick={(stage) => navigate(`/cases?stage=${stage}`)} />}
      </section>
    </>
  );
}

function Kpis({ data }) {
  const areaPercent = fmt.percent(data.area_acquired_ha, data.area_notified_ha);
  const paidPercent = fmt.percent(data.compensation_paid_total, data.compensation_awarded_total);
  /* rnr_entitled_count is every household with a resettlement record,
     whatever its status — the denominator, not one of the buckets. */
  const rnrTotal = data.rnr_entitled_count;
  const rnrPercent = fmt.percent(data.rnr_completed_count, rnrTotal);
  const possessionTotal = data.possession_taken_count + data.possession_pending_count;
  const possessionPercent = fmt.percent(data.possession_taken_count, possessionTotal);

  return (
    <div className="kpis">
      <KpiTile
        label="Land acquired"
        value={fmt.hectaresPlain(data.area_acquired_ha)}
        unit="ha"
        of={`of ${fmt.hectares(data.area_notified_ha)} notified`}
        meter={areaPercent}
      />

      <KpiTile
        label="Compensation paid"
        value={fmt.rupeesShort(data.compensation_paid_total)}
        of={`of ${fmt.rupeesShort(data.compensation_awarded_total)} awarded`}
        meter={paidPercent}
        split={[{ label: 'outstanding', value: fmt.rupeesShort(data.compensation_pending_total) }]}
      />

      <KpiTile
        label="Affected families"
        value={fmt.count(data.affected_families_count)}
        split={[
          { label: 'with title', value: fmt.count(data.affected_families_landowner_count) },
          { label: 'without title', value: fmt.count(data.affected_families_landless_count) },
        ]}
      />

      <KpiTile
        label="Resettlement completed"
        value={fmt.count(data.rnr_completed_count)}
        of={`of ${fmt.count(rnrTotal)} entitled households`}
        meter={rnrPercent}
        split={[
          { label: 'in progress', value: fmt.count(data.rnr_in_progress_count) },
          { label: 'not started', value: fmt.count(data.rnr_pending_count) },
          { label: 'disputed', value: fmt.count(data.rnr_disputed_count) },
        ]}
      />

      <KpiTile
        label="Possession taken"
        value={fmt.count(data.possession_taken_count)}
        unit="parcels"
        of={`of ${fmt.count(possessionTotal)} acquired`}
        meter={possessionPercent}
      />
    </div>
  );
}

/* The nine stages stay in statutory order. A chart sorted by size would read
   more cleanly and would destroy the one thing the sequence means. */
function StageBars({ rows, onPick }) {
  const max = Math.max(1, ...rows.map((row) => row.case_count));

  return (
    <div className="stage-bars">
      {rows.map((row) => (
        <button
          key={row.stage}
          type="button"
          className={`stage-bar${row.case_count === 0 ? ' is-empty' : ''}`}
          onClick={() => row.case_count > 0 && onPick(row.stage)}
          disabled={row.case_count === 0}
        >
          <span className="stage-bar__label">{stageLabel(row.stage)}</span>
          <span className="stage-bar__track">
            <span
              className="stage-bar__fill"
              style={{ width: `${(row.case_count / max) * 100}%` }}
            />
          </span>
          <span className="stage-bar__count">{row.case_count}</span>
        </button>
      ))}
    </div>
  );
}
