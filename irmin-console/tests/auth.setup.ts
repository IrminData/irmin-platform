import { expect, test as setup } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Define the path to store the authentication state
const userAuthFile = path.join(__dirname, '../playwright/.auth/auth.json');

// Define the setup test for authentication
setup('authenticate', async ({ page }) => {
  // Navigate to the initial URL
  await page.goto('/');

  // Check if environment-specific authentication is required
  if (process.env.REQUIRE_ENV_AUTH === 'true') {
    // Wait for the verification URL to load
    await page.waitForURL('/api/verify-dev-access');
    // Fill in the password from environment variables
    await page
      .getByPlaceholder('Password')
      .fill(process.env.ENV_PASSWORD ?? '');
    // Click the sign-in button
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Wait for the main page to load
    await page.waitForURL('/en');
  }

  // Navigate to the sign-in page
  await page.goto('/en/sign-in');
  // Fill in the email from environment variables or use a default
  await page
    .getByPlaceholder('name@acme.corp')
    .fill(process.env.TEST_USER_EMAIL ?? 'example@example.com');
  // Fill in the password from environment variables or use a default
  await page
    .getByPlaceholder('Your super secret password')
    .fill(process.env.TEST_USER_PASSWORD ?? 'password');
  // Click the sign-in button
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Check the "Remember me" checkbox
  await page.getByRole('checkbox').check();
  // Verify that the page contains the expected text
  await expect(page.locator('h1')).toContainText('Manage Workspaces');
  // Save the authentication state to a file
  await page.context().storageState({ path: userAuthFile });
  // Navigate to the main page
  await page.goto('/en');
});
