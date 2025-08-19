import { test, expect } from '@playwright/test';

/**
 * Verifies that toggling an InlineCollapsibleCard persists across reloads
 * using the localStorage key `card-collapse:<id>`.
 */
test('goal panel collapse state persists across reload', async ({ page }) => {
  await page.goto('/');

  // Ensure clean initial state for this panel
  await page.evaluate(() => localStorage.removeItem('card-collapse:goal'));

  const panel = page.locator('[data-panel-id="goal"]');

  // Ensure starts expanded
  await expect(panel).toHaveAttribute('data-collapsed', 'false');

  // Click collapse toggle inside the panel header
  const collapseBtn = panel.getByRole('button', { name: 'Collapse' });
  await collapseBtn.click();

  // Collapsed
  await expect(panel).toHaveAttribute('data-collapsed', 'true');

  // Reload the page and confirm persistence
  await page.reload();
  await expect(page.locator('[data-panel-id="goal"]')).toHaveAttribute('data-collapsed', 'true');

  // Expand again to leave it in a clean state (optional)
  const expandBtn = page.locator('[data-panel-id="goal"]').getByRole('button', { name: 'Expand' });
  await expandBtn.click();
  await expect(page.locator('[data-panel-id="goal"]')).toHaveAttribute('data-collapsed', 'false');
});
