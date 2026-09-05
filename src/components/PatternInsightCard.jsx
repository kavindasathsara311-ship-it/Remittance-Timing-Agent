import React from 'react';
import { checkProactiveNudge, formatPatternData } from '../utils/patternRecognition';
import Icon from './Icon';

export default function PatternInsightCard({ patterns, recommendation }) {
  if (!patterns || !patterns.expectedNextDate) return null;

  const formatted = formatPatternData(patterns);
  const isNudgeActive = checkProactiveNudge(patterns.expectedNextDate, recommendation?.verdict);
  
  return (
    <div className="flex flex-col gap-4">
      {isNudgeActive && (
        <div className="rounded-lg bg-good-container p-4 flex items-start gap-3 border border-good">
          <Icon name="campaign" className="text-good mt-0.5" />
          <div>
            <h4 className="font-label-lg text-on-surface mb-1">Proactive Alert</h4>
            <p className="font-body-md text-on-surface-variant">
              Your next transfer is expected soon ({formatted.expectedNextDateFormatted}), and rates are currently peaking. Consider converting immediately when funds arrive.
            </p>
          </div>
        </div>
      )}
      
      <section className="card card-pad relative overflow-hidden">
        <h3 className="font-headline-sm text-on-surface mb-4">Remittance Patterns</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="font-label-sm text-on-surface-variant">Average Cadence</p>
            <p className="font-body-lg text-on-surface">Every {formatted.avgDaysBetweenTransfers} days</p>
          </div>
          <div>
            <p className="font-label-sm text-on-surface-variant">Expected Next</p>
            <p className="font-body-lg text-on-surface">{formatted.expectedNextDateFormatted}</p>
          </div>
          <div>
            <p className="font-label-sm text-on-surface-variant">Top Channel</p>
            <p className="font-body-lg text-on-surface">{formatted.topChannel}</p>
          </div>
          <div>
            <p className="font-label-sm text-on-surface-variant">Average Amount</p>
            <p className="font-body-lg text-on-surface">{formatted.avgAmountFormatted}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
