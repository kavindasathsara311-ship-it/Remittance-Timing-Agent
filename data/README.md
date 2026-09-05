# Data Schema

This document details the JSON shapes returned by the backend logic in `src/services/api.js`. Use this contract to know exactly what the UI components will receive.

## 1. FX History
`getFxHistory(pair, days)`
Returns an array of daily FX rates, ordered oldest to newest.

```typescript
type FxHistory = Array<{
  date: string; // ISO format "YYYY-MM-DD"
  rate: number; // e.g. 302.45
}>;
```

## 2. Recommendation
`getRecommendation(pair)`
Returns the calculated verdict on whether to convert today.

```typescript
type Recommendation = {
  verdict: "WAIT" | "CONVERT_NOW" | "NEUTRAL";
  currentRate: number;
  avgRate7d: number;
  percentDiff: number; // percentage difference from 7-day average
  confidence: "high" | "medium" | "low";
};
```

## 3. Channels
`getChannels(amount, pair)`
Returns available remittance channels, sorted best-first by effective rate.

```typescript
type Channel = {
  channel: string;       // e.g. "Wise"
  icon: string;          // Material Icon string e.g. "public"
  effectiveRate: number; // Rate after fees
  midMarketRate: number; // True mid-market rate
  feePercent: number;    // Total fee as a percentage
  flagged: boolean;      // true if feePercent >= 2.0 (high fees)
  receive: number;       // The final amount received by the family
  gapFromMid: number;    // Difference between midMarketRate and effectiveRate
};
```

## 4. Coach Message
`getCoachMessage(scenario)`
Returns a single contextual message from the AI agent based on the scenario.

```typescript
type CoachMessage = {
  message: string;
  tone: "reassuring" | "calm" | "info" | "warning";
};
```

## 5. History
`getHistory()`
Returns a mock list of past remittance events.

```typescript
type HistoryEvent = {
  id: string;
  date: string;
  amount: number;
  currency: string;
  senderCountry: string;
  channel: string;
  rate: number;
  received: number;
  status: string; // e.g., "Completed"
};
```
