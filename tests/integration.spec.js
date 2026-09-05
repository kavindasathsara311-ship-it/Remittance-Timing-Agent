import { test, expect } from '@playwright/test';

test.describe('Remittance Coach Integration', () => {
  test('loads dashboard and renders main components', async ({ page }) => {
    await page.goto('/');

    // Check header
    await expect(page.getByRole('link', { name: 'Remittance Coach' })).toBeVisible();

    // The Dashboard should render the channel comparison section
    await expect(page.getByText('Compare channels')).toBeVisible();

    // Check if the Chart component mounts
    await expect(page.locator('.recharts-responsive-container')).toBeVisible();

    // Check if the Channel comparison table loads data (Wise is always in our mock data)
    await expect(page.getByText('Wise', { exact: true })).toBeVisible();

    // Check the currency pair tabs exist
    await expect(page.getByRole('tab', { name: 'USD → LKR' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'SAR → LKR' })).toBeVisible();
  });
});
