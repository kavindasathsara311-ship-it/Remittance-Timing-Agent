import { describe, it, expect } from 'vitest';
import { getMockRecommendation, getMockChannels } from './mockData';

describe('mockData core logic', () => {
  describe('getMockRecommendation', () => {
    it('returns a correct verdict based on history trend', () => {
      const rec = getMockRecommendation('USD_LKR');
      expect(rec).toHaveProperty('verdict');
      expect(rec).toHaveProperty('currentRate');
      expect(rec).toHaveProperty('avgRate7d');
      expect(rec).toHaveProperty('percentDiff');
      expect(rec).toHaveProperty('confidence');
      
      // Since mockData uses seeded RNG for USD_LKR, we can assert expected behavior 
      // or at least that it follows its own rules
      if (rec.percentDiff >= 0.8) {
        expect(rec.verdict).toBe('CONVERT_NOW');
      } else if (rec.percentDiff <= -0.8) {
        expect(rec.verdict).toBe('WAIT');
      } else {
        expect(rec.verdict).toBe('NEUTRAL');
      }
    });

    it('handles empty or null history gracefully (edge case)', () => {
      const recEmpty = getMockRecommendation('USD_LKR', []);
      expect(recEmpty.verdict).toBe('NEUTRAL');
      expect(recEmpty.currentRate).toBe(0);
      expect(recEmpty.percentDiff).toBe(0);

      const recNull = getMockRecommendation('USD_LKR', null);
      expect(recNull.verdict).toBe('NEUTRAL');
      expect(recNull.currentRate).toBe(0);
      expect(recNull.percentDiff).toBe(0);
    });

    it('handles a flat history without divide by zero errors', () => {
      const flatHistory = Array.from({ length: 30 }).map(() => ({ rate: 0 }));
      const recFlat = getMockRecommendation('USD_LKR', flatHistory);
      expect(recFlat.verdict).toBe('NEUTRAL');
      expect(recFlat.percentDiff).toBe(0);
    });
  });

  describe('getMockChannels', () => {
    it('sorts channels by effective rate and flags high fees', () => {
      const channels = getMockChannels(500, 'USD_LKR');
      expect(channels.length).toBeGreaterThan(0);
      
      // Check sorting
      for (let i = 0; i < channels.length - 1; i++) {
        expect(channels[i].effectiveRate).toBeGreaterThanOrEqual(channels[i+1].effectiveRate);
      }

      // Check flagging logic (threshold is 2.0)
      const flaggedChannels = channels.filter(c => c.flagged);
      flaggedChannels.forEach(c => {
        expect(c.feePercent).toBeGreaterThanOrEqual(2.0);
      });
      
      const safeChannels = channels.filter(c => !c.flagged);
      safeChannels.forEach(c => {
        expect(c.feePercent).toBeLessThan(2.0);
      });
    });

    it('handles missing feePercent in channel template (edge case)', () => {
      const badTemplates = [{ channel: 'BadChannel', icon: 'test' }]; // Missing feePercent
      const channels = getMockChannels(500, 'USD_LKR', badTemplates);
      expect(channels[0].channel).toBe('BadChannel');
      // The jitter may add up to 0.1, so it should be near 0
      expect(channels[0].feePercent).toBeLessThan(0.2); 
    });

    it('handles remittance amount of 0 gracefully without breaking (edge case)', () => {
      const channels = getMockChannels(0, 'USD_LKR');
      expect(channels[0].receive).toBe(0);
    });

    it('handles non-numeric remittance amount gracefully (edge case)', () => {
      const channels = getMockChannels("invalid", 'USD_LKR');
      expect(channels[0].receive).toBe(0); // safeAmount Number fallback
    });
  });
});
