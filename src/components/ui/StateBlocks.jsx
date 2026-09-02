import Icon from '../Icon';
import { t } from '../../i18n/strings';

/* Small, reusable async-state blocks so every data area degrades gracefully. */

export function LoadingBlock({ label = t.common.loading, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-on-surface-variant ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-9 w-9">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary/30" />
        <span className="relative inline-flex h-9 w-9 rounded-full border-2 border-secondary/30 border-t-secondary animate-spin" />
      </span>
      <span className="font-label-md text-label-md">{label}</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-center ${className}`}
      role="alert"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-wait-container text-on-wait-container">
        <Icon name="wifi_off" className="text-[24px]" />
      </span>
      <p className="font-body-md text-on-surface">{message || t.common.somethingWrong}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 rounded-full bg-secondary px-4 py-2 font-label-md text-on-secondary transition-opacity hover:opacity-90"
        >
          {t.common.retry}
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ icon = 'inbox', message, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 text-center text-on-surface-variant ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-high">
        <Icon name={icon} className="text-[24px]" />
      </span>
      <p className="font-body-md">{message}</p>
    </div>
  );
}
