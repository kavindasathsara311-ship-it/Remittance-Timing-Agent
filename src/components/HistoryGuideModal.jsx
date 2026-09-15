import Icon from './Icon';
import { t } from '../i18n/strings';

export default function HistoryGuideModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40 p-4 backdrop-blur-sm animate-fade-in">
      <div 
        className="card card-pad max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-outline-variant shadow-elevated"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/40 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
              <Icon name="help" className="text-[22px]" />
            </span>
            <div>
              <h2 id="guide-title" className="font-headline-md text-headline-md text-on-surface">
                {t.history.guide.title}
              </h2>
              <p className="mt-0.5 font-label-md text-label-md font-normal text-on-surface-variant">
                {t.history.guide.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
            aria-label={t.common.close}
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Steps Grid */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <GuideCard
            icon="edit_note"
            title={t.history.guide.step1Title}
            description={t.history.guide.step1Desc}
          />
          <GuideCard
            icon="auto_awesome"
            title={t.history.guide.step2Title}
            description={t.history.guide.step2Desc}
          />
          <GuideCard
            icon="notifications_active"
            title={t.history.guide.step3Title}
            description={t.history.guide.step3Desc}
          />
          <GuideCard
            icon="compare_arrows"
            title={t.history.guide.step4Title}
            description={t.history.guide.step4Desc}
          />
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-outline-variant/40 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full bg-primary px-6 py-2.5 font-label-lg text-label-lg font-medium text-on-primary hover:bg-primary/90 transition-colors shadow-soft"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}

function GuideCard({ icon, title, description }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-4 border border-outline-variant/30 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container mt-0.5">
        <Icon name={icon} className="text-[20px]" />
      </span>
      <div>
        <h4 className="font-label-lg text-label-lg text-on-surface font-semibold">{title}</h4>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
