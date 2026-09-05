import { useState, useEffect } from 'react';
import Icon from './Icon';
import { LoadingBlock, ErrorBlock } from './ui/StateBlocks';
import { computeRemittancePatterns, checkProactiveNudge, formatPatternData } from '../utils/patternRecognition';
import { getPatternInsight } from '../services/aiCoach';
import { formatDateFull } from '../utils/format';
import { t } from '../i18n/strings';

/**
 * PatternInsightCard — displays behavioral analysis of past family remittance history:
 *  1. Proactive alert if expected transfer is soon & rate verdict is CONVERT_NOW.
 *  2. Warm AI-generated insight (server-side via proxy).
 *  3. Pure-math computed metrics: average transfer gap, conversion timing, expected next transfer date.
 */
export default function PatternInsightCard({ patterns: patternsProp, recommendation, history, loading = false, error = null, onRetry }) {
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

  const patternData = patternsProp || computeRemittancePatterns(history);

  useEffect(() => {
    let isMounted = true;
    if (patternData && patternData.hasEnoughData) {
      setInsightLoading(true);
      getPatternInsight(patternData)
        .then((res) => {
          if (isMounted) setInsight(res);
        })
        .catch((err) => {
          console.error('Error fetching pattern insight:', err);
          if (isMounted) setInsight(t.pattern?.insufficientData || 'Not enough data.');
        })
        .finally(() => {
          if (isMounted) setInsightLoading(false);
        });
    } else {
      setInsight(t.pattern?.insufficientData || 'Not enough data.');
    }

    return () => {
      isMounted = false;
    };
  }, [history, patternsProp]);

  if (loading) {
    return (
      <section className="card card-pad">
        <LoadingBlock />
      </section>
    );
  }

  if (error) {
    return (
      <section className="card card-pad">
        <ErrorBlock onRetry={onRetry} />
      </section>
    );
  }

  const isNudgeActive = patternData?.expectedNextDate
    ? checkProactiveNudge(patternData.expectedNextDate, recommendation?.verdict)
    : false;

  const formatted = formatPatternData(patternData);

  return (
    <div className="flex flex-col gap-4">
      {/* Proactive Alert Banner */}
      {isNudgeActive && (
        <div className="rounded-lg bg-good-container p-4 flex items-start gap-3 border border-good">
          <Icon name="campaign" className="text-good mt-0.5" />
          <div>
            <h4 className="font-label-lg text-on-surface mb-1">Proactive Alert</h4>
            <p className="font-body-md text-on-surface-variant">
              Your next transfer is expected soon ({formatted?.expectedNextDateFormatted || patternData.expectedNextDate}), and rates are currently peaking. Consider converting immediately when funds arrive.
            </p>
          </div>
        </div>
      )}

      {/* Main Pattern Insight Card */}
      <section className="card card-pad relative overflow-hidden border border-outline-variant/40 shadow-soft">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                <Icon name="auto_awesome" className="text-[18px]" />
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface">
                {t.pattern?.title || 'Family Remittance Pattern'}
              </h2>
            </div>
            <p className="mt-1 font-label-md text-label-md font-normal text-on-surface-variant">
              {t.pattern?.subtitle || 'AI-analyzed insights based on your family’s transfer timing and history'}
            </p>
          </div>
        </div>

        {/* AI Coach Insight Banner */}
        <div className="mb-6 rounded-xl bg-surface-variant/60 p-4 border border-outline-variant/30">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              <Icon name="psychology" className="text-[18px]" />
            </span>
            <div className="flex-1">
              <div className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-secondary">
                {t.pattern?.aiInsightTitle || 'Coach Insight'}
              </div>
              {insightLoading ? (
                <p className="mt-1 font-body-md text-on-surface-variant animate-pulse">
                  Analyzing transfer patterns…
                </p>
              ) : (
                <p className="mt-1 font-body-md leading-relaxed text-on-surface">
                  {insight}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        {patternData && (patternData.hasEnoughData || patternData.avgDaysBetweenTransfers > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Metric 1: Avg Gap */}
            <div className="rounded-lg bg-surface-container-low p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
                {t.pattern?.avgInterval || 'Average transfer gap'}
              </span>
              <span className="mt-1 font-headline-md text-[22px] font-bold text-on-surface">
                {patternData.avgDaysBetweenTransfers} <span className="text-body-md font-normal text-on-surface-variant">days</span>
              </span>
              <span className="mt-1 font-label-sm text-[12px] text-on-surface-variant/80">
                Between transfers
              </span>
            </div>

            {/* Metric 2: Conversion Timing */}
            <div className="rounded-lg bg-surface-container-low p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
                {t.pattern?.conversionTime || 'Conversion timing'}
              </span>
              <span className="mt-1 font-headline-md text-[22px] font-bold text-on-surface">
                ~{patternData.avgDaysToConvert} <span className="text-body-md font-normal text-on-surface-variant">days</span>
              </span>
              <span className="mt-1 font-label-sm text-[12px] text-on-surface-variant/80">
                From arrival to spend
              </span>
            </div>

            {/* Metric 3: Likely Next Transfer */}
            <div className="rounded-lg bg-surface-container-low p-3.5 border border-outline-variant/30 flex flex-col">
              <span className="font-label-sm text-label-sm font-normal text-on-surface-variant">
                {t.pattern?.nextExpected || 'Likely next transfer'}
              </span>
              <span className="mt-1 font-headline-md text-[18px] font-bold text-secondary">
                {patternData.expectedNextDate ? formatDateFull(patternData.expectedNextDate) : 'N/A'}
              </span>
              <span className="mt-1 font-label-sm text-[12px] text-on-surface-variant/80">
                Based on historical frequency
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
