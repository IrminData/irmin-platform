import { expect, test } from '@playwright/test';

test('website opens and has content', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('#website-hero-section')).toBeVisible();
  await expect(page.locator('h1').first()).toContainText(
    'Just like GitHub for your Data'
  );
});

test('language switcher works', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('#footer-newsletter-form')).toContainText(
    'Subscribe to our newsletter'
  );
  await page
    .locator('#language-switcher div')
    .filter({ hasText: 'English' })
    .first()
    .click();
  await page.getByRole('option', { name: 'Suomi' }).click();
  await expect(page.locator('#footer-newsletter-form')).toContainText(
    'Tilaa uutiskirjeemme'
  );
});

test('can navigate to console', async ({ page }) => {
  await page.goto('/en');
  // Get viewport width
  const viewportSize = await page.viewportSize();
  if (viewportSize && viewportSize.width >= 1200) {
    // Desktop view
    await page.getByRole('link', { name: 'Console' }).click();
  } else {
    // Mobile view
    await page.getByLabel('Open or close the navigation').click();
    await page.getByRole('link', { name: 'Console' }).click();
  }
  // Make sure workspace management page is loaded
  await expect(page.locator('h1')).toContainText('Manage Workspaces');
});
