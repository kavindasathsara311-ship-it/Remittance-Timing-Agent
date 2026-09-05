import { describe, it, expect } from 'vitest';
import { calculateEffectiveRates } from './channelComparison';

describe('Channel Comparison Engine', () => {
  it('correctly calculates final payout and identifies the best channel', () => {
    const channels = [
      { channel: 'High Margin Zero Fee', flatFee: 0, feePercent: 0, offeredRate: 290 }, // (500 - 0) * 290 = 145000
      { channel: 'Low Margin Flat Fee', flatFee: 5, feePercent: 0, offeredRate: 300 }, // (500 - 5) * 300 = 148500
      { channel: 'Percent Fee', flatFee: 0, feePercent: 1.5, midMarketRate: 300 }, // (500 - 7.5) * 300 = 147750
    ];

    const result = calculateEffectiveRates(500, channels);

    expect(result.sortedChannels.length).toBe(3);
    
    // The flat fee channel should win despite having a $5 upfront fee
    expect(result.bestChannel.channel).toBe('Low Margin Flat Fee');
    expect(result.bestChannel.finalPayout).toBe(148500);

    // Percent fee should be second
    expect(result.sortedChannels[1].channel).toBe('Percent Fee');
    expect(result.sortedChannels[1].finalPayout).toBe(147750);

    // Zero fee should be last because of the poor exchange rate
    expect(result.sortedChannels[2].channel).toBe('High Margin Zero Fee');
    expect(result.sortedChannels[2].finalPayout).toBe(145000);
  });

  it('handles empty channels gracefully', () => {
    const result = calculateEffectiveRates(500, []);
    expect(result.bestChannel).toBe(null);
    expect(result.sortedChannels.length).toBe(0);
  });
});
