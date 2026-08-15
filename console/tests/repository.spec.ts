import { expect, type Page, test } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const repository = process.env.TEST_USER_REPOSITORY ?? 'Example Repository';
const repositorySlug =
  process.env.TEST_USER_REPOSITORY_SLUG ?? 'example-repository';
const workspace = process.env.TEST_USER_WORKSPACE_SLUG ?? 'test-workspace';

const getSuccessAlert = (page: Page) =>
  page.getByRole('status').filter({
    has: page.getByRole('heading', { name: 'Success' }),
  });

test('can open repositories page', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/dashboard`);
  await page.getByRole('link', { name: 'Repositories', exact: true }).click();

  // Wait for the URL to change to the repositories page
  await page.waitForURL(`/en/workspace/${workspace}/repositories`);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Repositories' })
  ).toBeVisible();
});

test('test repository is visible', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories`);
  await expect(
    page.getByRole('row').filter({ hasText: repository }).first()
  ).toBeVisible();
});

test('can create repository', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories`);

  // Make sure the create repository button is visible
  await expect(
    page.getByRole('button', { name: 'Create new repository' })
  ).toBeVisible();

  // Open the create repository side modal
  await page.getByRole('button', { name: 'Create new repository' }).click();

  const dialog = page.getByRole('dialog', {
    name: 'Create new repository',
  });
  await expect(dialog).toBeVisible();

  // Fill in the create repository form
  await dialog
    .locator('input[name="name"]')
    .fill(`Test repository ${Date.now()}`);
  await dialog
    .locator('textarea[name="description"]')
    .fill('This is a test repository created by an automated test');

  await dialog
    .getByRole('button', { name: 'Create new repository', exact: true })
    .click();

  // Make sure the success message is visible after creating the repository
  await expect(getSuccessAlert(page)).toBeVisible();
});

test('can open repository', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories`);

  const repositoryRow = page
    .getByRole('row')
    .filter({ hasText: repository })
    .first();
  await expect(repositoryRow).toBeVisible();

  await repositoryRow.getByRole('link', { name: 'View' }).click();

  // Wait for the URL to change to the repository page
  await page.waitForURL(
    `/en/workspace/${workspace}/repositories/${repositorySlug}`
  );

  // Make sure the repository page is shown
  await expect(page.getByRole('heading', { name: repository })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Run query' })).toBeVisible();
});

test('can switch between branches', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Make sure the branch selector is visible
  await expect(page.locator('#branch-selector')).toBeVisible();

  // Open the branch selector
  await page.locator('#branch-selector').getByRole('combobox').click();

  // Select the second option
  await page.getByRole('option').nth(1).click();
});

test('can run query', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  const editor = page.locator('.codemirror-editor').getByRole('textbox');
  await editor.fill('SELECT 1 AS test_value');

  // Run the query
  await page.getByRole('button', { name: 'Run query' }).click();

  // Check that query results are displayed
  await expect(page.getByRole('button', { name: 'Results' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Logs' })).toBeVisible();
  await expect(page.getByText('Query results')).toBeVisible();
});

test('can view commits', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Click on the commits tab
  await page.getByRole('link', { name: 'Commits', exact: true }).click();

  // Wait for the URL to change to the commits page
  await page.waitForURL(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/commits`
  );

  // Make sure the heading is correct and the commits table is visible
  await expect(page.locator('#commits-list')).toBeVisible();
});

test('can open commit ref', async ({ page, context }) => {
  // Grant clipboard permissions to browser context
  await context.grantPermissions(['clipboard-read']);

  // Go to the commits page
  await page.goto(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/commits`
  );

  const commitRow = page
    .locator('#commits-list')
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: 'Copy hash' }) })
    .first();
  await expect(commitRow).toBeVisible();

  await commitRow.getByRole('button', { name: 'Copy hash' }).click();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Commit hash copied to clipboard' })
  ).toBeVisible();

  // Get clipboard content after the link/button has been clicked
  const handle = await page.evaluateHandle(() =>
    navigator.clipboard.readText()
  );
  const clipboardContent = await handle.jsonValue(); // <- this should be the commit hash

  await commitRow.getByRole('button', { name: 'View' }).click();

  await page.waitForURL((url) => {
    return (
      url.pathname ===
        `/en/workspace/${workspace}/repositories/${repositorySlug}` &&
      url.searchParams.get('ref') === clipboardContent
    );
  });

  await expect(page.getByRole('heading', { name: repository })).toBeVisible();
});

test('can view branches', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Click on the branches tab
  await page.getByRole('link', { name: 'Branches', exact: true }).click();

  // Wait for the URL to change to the branches page
  await page.waitForURL(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/branches`
  );

  // Make sure the heading is correct and the branches list is visible
  await expect(page.locator('#branches-list')).toBeVisible();
});

test('can create branch', async ({ page }) => {
  await page.goto(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/branches`
  );

  // Make sure the create branch button is visible
  await expect(
    page.getByRole('button', { name: 'Create branch' })
  ).toBeVisible();

  // Click on the create branch button
  await page.getByRole('button', { name: 'Create branch' }).click();

  // Make sure the create branch modal is visible
  await expect(
    page.getByRole('heading', { name: 'Create branch' })
  ).toBeVisible();
  const dialog = page.getByRole('dialog', { name: 'Create branch' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Create branch', exact: true })
  ).toBeVisible();

  // Get new branch name to create
  const newBranchName = `test-branch-${Date.now()}`;

  // Fill in the form and submit
  await dialog.locator('input[name="branchName"]').fill(newBranchName);
  await dialog
    .getByRole('button', { name: 'Create branch', exact: true })
    .click();

  // Make sure the success message is visible
  await expect(getSuccessAlert(page)).toBeVisible();
});

test('can delete branch', async ({ page }) => {
  await page.goto(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/branches`
  );

  const branchRow = page
    .locator('#branches-list')
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: 'Delete' }) })
    .first();
  await expect(branchRow).toBeVisible();
  await branchRow.getByRole('button', { name: 'Delete' }).click();

  const confirmation = page.getByRole('alertdialog', {
    name: 'Delete Branch',
  });
  await expect(confirmation).toContainText(
    'Are you sure you want to delete this branch?'
  );
  await confirmation
    .getByRole('button', { name: 'Delete Branch', exact: true })
    .click();

  // Make sure the success message is visible
  await expect(getSuccessAlert(page)).toBeVisible();
});

test('can view documentation', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // README lives in the secondary navigation menu.
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menuitem', { name: 'README', exact: true }).click();

  // Wait for the URL to change to the documentation page
  await page.waitForURL(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/documentation`
  );

  // Make sure the documentation form and editor are visible
  await expect(page.locator('#mdx-documentation-editor')).toBeVisible();
  await expect(page.getByLabel('editable markdown')).toBeVisible();
});

test('can update documentation', async ({ page }) => {
  await page.goto(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/documentation`
  );

  const editor = page.getByLabel('editable markdown');
  await expect(editor).toBeVisible();
  const currentDocumentation = (await editor.textContent()) ?? '';
  await editor.fill(`${currentDocumentation} ${Date.now()}`);

  // Save the changes and wait for the success message
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(getSuccessAlert(page)).toBeVisible();

  // The editor remains available after saving.
  await expect(page.locator('#mdx-documentation-editor')).toBeVisible();
  await expect(page.getByRole('toolbar')).toBeVisible();
  await expect(editor).toBeVisible();
});

test('can view settings', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Settings lives in the secondary navigation menu.
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Settings', exact: true }).click();

  // Wait for the URL to change to the settings page
  await page.waitForURL(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/settings`
  );

  // Make sure the settings form is visible
  await expect(page.locator('#repository-settings-section')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  await expect(page.getByText('Danger zone')).toBeVisible();
});

test('can update settings', async ({ page }) => {
  await page.goto(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/settings`
  );

  // Update the description field and save the changes
  const description = `Description updated by an automated test, ${Date.now()}`;
  await page.getByRole('textbox', { name: 'Description' }).fill(description);
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // Make sure the success message is visible
  await expect(getSuccessAlert(page)).toBeVisible();
});

test('can delete repository', async ({ page }) => {
  await page.goto(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/settings`
  );

  // Click on the delete repository button
  await page.getByRole('button', { name: 'Delete repository' }).click();

  const confirmation = page.getByRole('alertdialog', {
    name: 'Delete repository',
  });
  await expect(confirmation).toContainText('Are you sure you want to delete');
  await expect(confirmation).toContainText(repository);

  // Cancel the deletion
  await confirmation
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();

  // Make sure the confirmation modal is closed
  await expect(confirmation).not.toBeVisible();

  // Click on the delete repository button again
  await page.getByRole('button', { name: 'Delete repository' }).click();

  // Confirm the deletion
  await confirmation
    .getByRole('button', { name: 'Delete repository', exact: true })
    .click();

  // Make sure the success message is visible
  await expect(getSuccessAlert(page)).toBeVisible();
});

test('can download repository', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download' }).click();
  await expect(await downloadPromise).toBeDefined();
});

test('file upload dialog opens and closes', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  await page.getByRole('button', { name: 'Upload object' }).click();

  const dialog = page.getByRole('dialog', { name: 'Upload Files' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', {
      name: 'Drop files here or click to select',
    })
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();

  await expect(dialog).not.toBeVisible();
});

test('can upload a file to repository', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  await page.getByRole('button', { name: 'Upload object' }).click();

  const dialog = page.getByRole('dialog', { name: 'Upload Files' });
  await expect(dialog).toBeVisible();

  const fileName = `automated-upload-${Date.now()}.txt`;
  await dialog
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from('Uploaded by the repository Playwright test'),
    });
  await expect(dialog.getByText(fileName, { exact: true })).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Upload 1 Files', exact: true })
    .click();

  await expect(dialog).toContainText('1 uploaded');
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
