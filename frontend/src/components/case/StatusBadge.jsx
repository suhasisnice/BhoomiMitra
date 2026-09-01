import Badge from '../ui/Badge';
import {
  caseStatusLabel,
  compensationStatusLabel,
  noticeTypeLabel,
  objectionStatusLabel,
  parcelStatusLabel,
  proposalStatusLabel,
  riskBandLabel,
  rnrStatusLabel,
  severityLabel,
  stageLabel,
  timelineStatusLabel,
  tone,
} from '../../lib/labels';

/* One badge for every kind of status in the product.

   A component passes the value it received from the API and says which kind
   it is; it never types the string or picks the colour. `kind` selects the
   label table, and the tone comes from the value itself. */
const LABEL = {
  case: caseStatusLabel,
  parcel: parcelStatusLabel,
  compensation: compensationStatusLabel,
  rnr: rnrStatusLabel,
  objection: objectionStatusLabel,
  severity: severityLabel,
  stage: stageLabel,
  proposal: proposalStatusLabel,
  timeline: timelineStatusLabel,
  risk: riskBandLabel,
  notice: noticeTypeLabel,
};

/* Kinds that name a position in a process rather than a state of health. A
   declaration is not "better" than a preliminary notification, and a case at
   award is not "worse" than one at possession, so neither takes a status
   colour. */
const NEUTRAL_KINDS = new Set(['stage', 'notice']);

export default function StatusBadge({ kind = 'case', value, title }) {
  if (!value) return <span style={{ color: 'var(--text-faint)' }}>—</span>;

  const label = (LABEL[kind] || LABEL.case)(value);
  const badgeTone = NEUTRAL_KINDS.has(kind) ? 'info' : tone(value);

  return (
    <Badge tone={badgeTone} title={title}>
      {label}
    </Badge>
  );
}
