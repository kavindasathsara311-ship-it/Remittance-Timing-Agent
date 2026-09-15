import { describe, it, expect, beforeEach } from 'vitest';
import {
  getHistory,
  addHistoryRecord,
  updateHistoryRecord,
  deleteHistoryRecord,
  resetHistoryData,
} from './api';

describe('History CRUD and Persistence API', () => {
  beforeEach(async () => {
    // Reset to clean mock state before each test
    await resetHistoryData();
  });

  it('fetches initial history array correctly', async () => {
    const history = await getHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty('id');
    expect(history[0]).toHaveProperty('amount');
    expect(history[0]).toHaveProperty('channel');
  });

  it('adds a new history record successfully', async () => {
    const initial = await getHistory();
    const newRecord = {
      date: '2026-09-15',
      amount: 750,
      currency: 'USD',
      senderCountry: 'United States',
      channel: 'Wise',
      rate: 305.5,
      status: 'Completed',
    };

    const updated = await addHistoryRecord(newRecord);
    expect(updated.length).toBe(initial.length + 1);
    expect(updated[0].amount).toBe(750);
    expect(updated[0].currency).toBe('USD');
    expect(updated[0].received).toBe(Math.round(750 * 305.5 * 100) / 100);
  });

  it('updates an existing history record', async () => {
    const history = await getHistory();
    const target = history[0];

    const updatedList = await updateHistoryRecord(target.id, {
      amount: 1000,
      channel: 'Instarem',
    });

    const updatedItem = updatedList.find((item) => item.id === target.id);
    expect(updatedItem).toBeTruthy();
    expect(updatedItem.amount).toBe(1000);
    expect(updatedItem.channel).toBe('Instarem');
  });

  it('deletes a history record', async () => {
    const history = await getHistory();
    const target = history[0];

    const updatedList = await deleteHistoryRecord(target.id);
    expect(updatedList.length).toBe(history.length - 1);
    expect(updatedList.find((item) => item.id === target.id)).toBeUndefined();
  });

  it('resets history data back to initial sample records', async () => {
    const history = await getHistory();
    const target = history[0];

    await deleteHistoryRecord(target.id);
    const afterDelete = await getHistory();
    expect(afterDelete.length).toBe(history.length - 1);

    const resetList = await resetHistoryData();
    expect(resetList.length).toBe(history.length);
  });
});
