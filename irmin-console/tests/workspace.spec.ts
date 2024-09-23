import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const newWorkspaceName = `Test workspace ${Date.now()}`;
const workspaceName = process.env.TEST_USER_WORKSPACE ?? 'Test workspace';

test('can switch to a workspace', async ({ page }) => {
  // Go to the workspace management page
  await page.goto('/en/console/manage-workspaces');

  // Make sure workspace management page is loaded
  await expect(page.locator('h1')).toContainText('Manage Workspaces');

  // Make sure that the workspace switcher is visible
  await expect(page.getByText(`Workspace${workspaceName}`)).toBeVisible();

  // Switch to the Example Core workspace
  await page.getByRole('heading', { name: workspaceName }).click();

  // Make sure that the workspace has been switched
  await expect(page.locator('#console-content')).toContainText(workspaceName);
  await expect(page.locator('#console-content')).toContainText(
    'Get started on Irmin with these quick actions:'
  );
  await expect(page.locator('#console-nav-workspace-switcher')).toContainText(
    workspaceName
  );
});

test('can create a new workspace', async ({ page }) => {
  // Go to the workspace management page
  await page.goto('/en/console/manage-workspaces');

  // Make sure workspace management page is loaded and has the workspace creation form
  await expect(page.locator('#console-content')).toContainText(
    'Create new workspace'
  );

  // Fill in the workspace creation form
  await page.getByPlaceholder('Workspace Name').fill(newWorkspaceName);
  await page
    .getByPlaceholder('Workspace Description')
    .fill('This is a test workspace created by an automated test');

  // Submit the form
  await page.getByRole('button', { name: 'Create new workspace' }).click();

  // This will only work if the system is not in offline mode
  if (process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true') {
    // If in offline mode, the workspace will not be created
    // The example response from the API is shown instead
    await expect(page.locator('#console-content')).toContainText(
      'This is example for IrminAPIResponse'
    );
  } else {
    // Make sure that the workspace has been created
    await expect(page.locator('#console-content')).toContainText(
      'The workspace has been successfully created.'
    );

    // Make sure that the workspace is visible in the switcher
    await expect(page.getByText(`Workspace${workspaceName}`)).toBeVisible();

    // Switch to the new workspace
    await page.getByRole('heading', { name: newWorkspaceName }).click();

    // Make sure that the workspace has been switched
    await expect(page.locator('#console-content')).toContainText(
      newWorkspaceName
    );
    await expect(page.locator('#console-content')).toContainText(
      'Get started on Irmin with these quick actions:'
    );
    await expect(page.locator('#console-nav-workspace-switcher')).toContainText(
      newWorkspaceName
    );
  }
});
