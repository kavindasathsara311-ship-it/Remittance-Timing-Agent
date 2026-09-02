import Icon from '../Icon';

/* =============================================================================
 * StatusBadge — a calm pill used for verdicts and channel tags.
 * Colour is driven by a semantic status key only; copy is passed in by the
 * caller (so it stays localisable). Red is reserved for genuine fee warnings.
 * ===========================================================================*/

const STYLES = {
  good: 'bg-good-container text-on-good-container',
  wait: 'bg-wait-container text-on-wait-container',
  neutral: 'bg-neutral-container text-on-neutral-container',
  warn: 'bg-warn-container text-on-warn-container',
};

const SIZES = {
  sm: 'text-label-sm px-2.5 py-1 gap-1',
  md: 'text-label-md px-3 py-1.5 gap-1.5',
};

export default function StatusBadge({
  status = 'neutral',
  icon,
  filled = true,
  size = 'md',
  className = '',
  children,
}) {
  const palette = STYLES[status] || STYLES.neutral;
  const sizing = SIZES[size] || SIZES.md;
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${palette} ${sizing} ${className}`}
    >
      {icon && (
        <Icon
          name={icon}
          filled={filled}
          className={size === 'sm' ? 'text-[14px]' : 'text-[18px]'}
        />
      )}
      {children}
    </span>
  );
}
