import Icon from './Icon';
import { t } from '../i18n/strings';

/* =============================================================================
 * ScenarioPicker — the demo situation buttons that replay a coach conversation.
 * The fee-warning scenario is tinted red (a genuine warning); the rest stay calm.
 * ===========================================================================*/

export const SCENARIO_KEYS = ['good_time', 'bad_time', 'urgent', 'predatory_channel'];

export default function ScenarioPicker({ active, onSelect, className = '' }) {
  return (
    <div className={className}>
      <p className="mb-2 font-label-sm text-label-sm text-on-surface-variant">
        {t.coach.scenarioPrompt}
      </p>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {SCENARIO_KEYS.map((key) => {
          const s = t.scenarios[key];
          const isActive = key === active;
          const isWarning = key === 'predatory_channel';

          const base =
            'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 font-label-md transition-all active:scale-95';
          const palette = isActive
            ? isWarning
              ? 'border-warn bg-warn text-on-error'
              : 'border-secondary bg-secondary text-on-secondary'
            : isWarning
            ? 'border-warn/40 text-warn hover:bg-warn-container/40'
            : 'border-outline-variant/60 bg-surface-container-lowest text-primary hover:bg-surface-variant';

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={isActive}
              title={s.hint}
              className={`${base} ${palette}`}
            >
              <Icon name={s.icon} className="text-[18px]" filled={isActive} />
              {s.button}
            </button>
          );
        })}
      </div>
    </div>
  );
}
