import { useEnums } from '../../hooks/useEnums';
import * as fmt from '../../lib/format';
import { stageLabel, stageSection } from '../../lib/labels';
import './case.css';

/* The centrepiece. Nine statutory stages, where this case stands, when each
   was reached, and who moved it.

   Treated as the product, not a detail — it is the one component that could
   not belong to any other piece of software. Each stage carries its section
   of the Act, and a stage that has been reached shows the date and the
   officer from the case's own history rather than a generic tick. */
export default function StageTimeline({ stage, history = [], stalledDays }) {
  const { stages } = useEnums();
  const order = stages.length ? stages : FALLBACK_ORDER;

  const currentIndex = order.indexOf(stage);

  /* The history can contain a stage more than once — a case sent back to an
     earlier stage is legal and happens. The most recent entry is the one
     that describes where it stands now. */
  const reached = new Map();
  for (const entry of history) {
    reached.set(entry.to_stage, entry);
  }

  return (
    <ol className="timeline">
      {order.map((value, index) => {
        const entry = reached.get(value);
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const state = isCurrent ? 'current' : isDone ? 'done' : 'ahead';

        return (
          <li key={value} className={`timeline__step is-${state}`}>
            <span className="timeline__marker" aria-hidden="true">
              <span className="timeline__dot" />
            </span>

            <div className="timeline__body">
              <p className="timeline__label">
                {stageLabel(value)}
                {stageSection(value) && (
                  <span className="timeline__section">{stageSection(value)}</span>
                )}
              </p>

              {isCurrent && (
                <p className="timeline__meta">
                  {entry ? `Reached ${fmt.date(entry.changed_on)}` : 'Current stage'}
                  {stalledDays !== null && stalledDays !== undefined && (
                    <>
                      {' · '}
                      <span className={stalledDays >= 10 ? 'is-overdue' : undefined}>
                        {fmt.days(stalledDays)} here
                      </span>
                    </>
                  )}
                </p>
              )}

              {!isCurrent && entry && (
                <p className="timeline__meta">
                  {fmt.date(entry.changed_on)}
                  {entry.note ? ` · ${entry.note}` : ''}
                </p>
              )}

              {!isCurrent && !entry && index > currentIndex && (
                <p className="timeline__meta timeline__meta--ahead">Not reached</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* Only used if /meta/enums has not landed yet, so the timeline draws its nine
   rows rather than collapsing to nothing mid-render. */
const FALLBACK_ORDER = [
  'preliminary_notification',
  'social_impact_assessment',
  'land_verification',
  'objection_period',
  'declaration',
  'award',
  'rehabilitation_resettlement',
  'possession',
  'monitoring',
];
