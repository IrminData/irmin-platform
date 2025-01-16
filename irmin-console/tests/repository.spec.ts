import { expect, test } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const repository = process.env.TEST_USER_REPOSITORY ?? 'Example Repository';
const repositorySlug =
  process.env.TEST_USER_REPOSITORY_SLUG ?? 'example-repository';
const workspace = process.env.TEST_USER_WORKSPACE_SLUG ?? 'test-workspace';

test('can open repositories page', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/home`);
  await page.getByRole('link', { name: 'Repositories', exact: true }).click();

  // Wait for the URL to change to the repositories page
  await page.waitForURL(`/en/workspace/${workspace}/repositories`);

  // Make sure h2 heading is correct
  await expect(page.locator('h2')).toContainText('Repositories');
});

test('test repository is visible', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories`);
  await expect(
    page.locator('#card-list-on-large-screen').getByText(repository)
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

  // Make sure the create repository form is visible and the modal is open
  await expect(page.locator('#create-repository-modal-content')).toBeVisible();

  // Fill in the create repository form
  const modal = page.locator('#create-repository-modal-content');
  await modal
    .locator('input[name="name"]')
    .fill(`Test repository ${Date.now()}`);
  await modal
    .locator('textarea[name="name"]')
    .fill('This is a test repository created by an automated test');
  await modal
    .locator(
      '.react-select-container > .react-select__control > .react-select__value-container > .react-select__input-container'
    )
    .click();
  await modal
    .locator('.react-select__menu > div[role="listbox"]')
    .first()
    .click();
  await modal.getByRole('button', { name: 'Add' }).click();

  // Submit the form
  await modal.locator('button[type="submit"]').click();

  // Make sure the success message is visible after creating the repository
  await expect(page.getByRole('heading', { name: 'Success' })).toBeVisible();
});

test('can open repository', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories`);

  // Wait for the repository list to load
  await page.waitForSelector('#card-or-normal-list');

  // Wait for at least one repository to show up
  await page.waitForSelector('#card-or-normal-list #list-row');

  // Find the #list-row which contains repository we are looking for
  const parent = await page
    .locator('#card-or-normal-list')
    .locator('#list-row', {
      hasText: repository,
    });

  // Click on the View button or link
  await parent.getByText('View').click();

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
  await page
    .locator(
      '#branch-selector > .react-select-container > .react-select__control > .react-select__value-container > .react-select__input-container'
    )
    .click();

  // Select the second option
  await page.locator('#branch-selector').getByRole('option').nth(1).click();
});

test('can run query', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Select the first collection
  await page.locator('#collection-selector').first().click();

  // Make sure the delete collection button shows up
  await expect(
    page.getByRole('button', { name: 'Delete collection' })
  ).toBeVisible();

  // Expect the text in the textbox not to be empty
  await expect(page.getByRole('textbox').first()).not.toHaveText('');

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
  await page.getByLabel('Tab Commits').click();

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

  // Click on the first commit to copy the hash
  await page.locator('.col-span-1 > .flex > .text-foreground').first().click();
  await expect(page.locator('#alert')).toContainText(
    'Commit hash copied to clipboard'
  );

  // Click the view button of the first commit
  await page.locator('.col-span-1 > .flex > .bg-gray-100').first().click();

  // Get clipboard content after the link/button has been clicked
  const handle = await page.evaluateHandle(() =>
    navigator.clipboard.readText()
  );
  const clipboardContent = await handle.jsonValue(); // <- this should be the commit hash

  // Wait for the URL to change to the ref page
  await page.waitForURL(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/refs/${clipboardContent}`
  );

  // Make sure the heading is correct
  await expect(page.locator('#console-content')).toContainText(
    `${workspace} / ${repositorySlug} / ${clipboardContent}`
  );
});

test('can view branches', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Click on the branches tab
  await page.getByLabel('Tab Branches').click();

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
  await expect(page.getByLabel('Close modal')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create branch' }).nth(1)
  ).toBeVisible();

  // Get new branch name to create
  const newBranchName = `test-branch-${Date.now()}`;

  // Fill in the form and submit
  await page.getByPlaceholder('New branch name').fill(newBranchName);
  await page.getByRole('button', { name: 'Create branch' }).nth(1).click();

  // Make sure the success message is visible
  await expect(page.getByRole('heading', { name: 'Success' })).toBeVisible();
});

test('can delete branch', async ({ page }) => {
  await page.goto(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/branches`
  );

  // Make sure the delete branch button is visible on the first row
  await expect(
    page.locator('#list-row').first().getByLabel('Delete')
  ).toBeVisible();

  // Click on the delete branch button
  await page.locator('#list-row').first().getByLabel('Delete').click();

  // Make sure that it failed to delete the default branch
  await expect(page.locator('#alert')).toContainText('Cannot delete');

  // Click on the delete button on the second row
  await page.locator('#list-row').nth(1).getByLabel('Delete').click();

  // Make sure the success message is visible
  await expect(page.getByRole('heading', { name: 'Success' })).toBeVisible();
});

test('can view documentation', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Click on the documentation tab
  await page.getByLabel('Tab Documentation').click();

  // Wait for the URL to change to the documentation page
  await page.waitForURL(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/documentation`
  );

  // Make sure the heading is correct and the MDX editor is visible
  await expect(page.locator('h2')).toContainText('Documentation');
  await expect(page.getByLabel('editable markdown')).toBeVisible();
});

test('can update documentation', async ({ page }) => {
  await page.goto(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/documentation`
  );

  // Click on the plain text button
  await page.getByRole('button', { name: 'Plain text' }).click();

  // Make sure the textarea#plain-text-documentation-editor is visible
  await expect(
    page.locator('textarea#plain-text-documentation-editor')
  ).toBeVisible();

  // Append Date.now() to the documentation
  const currentDocumentation = await page
    .locator('textarea#plain-text-documentation-editor')
    .inputValue();
  await page
    .locator('textarea#plain-text-documentation-editor')
    .fill(`${currentDocumentation} ${Date.now()}`);

  // Save the changes and wait for the success message
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Success' })).toBeVisible();

  // Click on the MDX button
  await page.getByRole('button', { name: 'Markdown editor' }).click();

  // Make suer the MDX editor is visible
  await expect(page.locator('#mdx-documentation-editor')).toBeVisible();
  await expect(page.getByRole('toolbar')).toBeVisible();
  await expect(page.getByLabel('editable markdown')).toBeVisible();
});

test('can view settings', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Click on the settings tab
  await page.getByLabel('Tab Settings').click();

  // Wait for the URL to change to the settings page
  await page.waitForURL(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/settings`
  );

  // Make sure the heading is correct and the form is visible
  await expect(page.locator('h2')).toContainText('Settings');
  await expect(
    page.getByRole('button', { name: 'Save changes' })
  ).toBeVisible();
  await expect(page.getByText('Danger zone')).toBeVisible();
});

test('can update settings', async ({ page }) => {
  await page.goto(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/settings`
  );

  // Update the description field and save the changes
  const description = `Description updated by an automated test, ${Date.now()}`;
  await page.locator('textarea[name="description"]').fill(description);
  await page.getByRole('button', { name: 'Save changes' }).click();

  // Make sure the success message is visible
  await expect(page.getByRole('heading', { name: 'Success' })).toBeVisible();
});

test('can delete repository', async ({ page }) => {
  await page.goto(
    `/en/workspace/${workspace}/repositories/${repositorySlug}/settings`
  );

  // Click on the delete repository button
  await page.getByRole('button', { name: 'Delete repository' }).click();

  // Make sure the confirmation modal is visible
  await expect(page.locator('#confirm')).toContainText(
    'Are you sure you want to delete this repository?'
  );

  // Cancel the deletion
  await page.getByLabel('Cancel confirmation').click();

  // Make sure the confirmation modal is closed
  await expect(page.locator('#confirm')).not.toBeVisible();

  // Click on the delete repository button again
  await page.getByRole('button', { name: 'Delete repository' }).click();

  // Confirm the deletion
  await page.getByLabel('Confirm', { exact: true }).click();

  // Make sure the success message is visible
  await expect(page.getByRole('heading', { name: 'Success' })).toBeVisible();
});

test('can download repository', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Click on the download button
  await page.getByRole('link', { name: 'Download' }).click();

  // Expect this to open a new tab
  const newPage = await page.waitForEvent('popup');
  await expect(newPage).toBeDefined();
});

test('collection upload checks required fields and closes', async ({
  page,
}) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Click on the upload button
  await page.getByRole('button', { name: 'Upload collection' }).click();

  // Submit the form without filling in any fields
  await page
    .locator('#irmin-modal')
    .getByRole('button', { name: 'Upload new collection' })
    .click();

  // Expect the error message to be visible
  await expect(page.locator('#irmin-modal')).toContainText(
    'This field is required'
  );

  // Close the modal
  await page.getByLabel('Close modal').click();

  // Make sure the modal is closed
  await expect(page.locator('#irmin-modal')).not.toBeVisible();
});

test('can upload collection to repository', async ({ page }) => {
  await page.goto(`/en/workspace/${workspace}/repositories/${repositorySlug}`);

  // Click on the upload button
  await page.getByRole('button', { name: 'Upload collection' }).click();

  // Make sure upload collection modal is visible
  await expect(page.getByLabel('Close modal')).toBeVisible();
  await expect(
    page
      .locator('#irmin-modal')
      .getByRole('heading', { name: 'Upload collection' })
  ).toBeVisible();

  // Fill in the form and submit
  await page
    .locator('input[name="name"]')
    .fill(`Test collection ${Date.now()}`);
  const exampleFilePath = path.resolve(__dirname, '../public/irmin-logo.svg');
  await page.locator('input[name="files"]').setInputFiles(exampleFilePath);
  await page.getByPlaceholder('/example/path').fill(`/folder-${Date.now()}`);
  await page
    .locator('#irmin-modal')
    .getByRole('button', { name: 'Upload new collection' })
    .click();

  // Expect the success message to be visible
  await expect(page.getByRole('heading', { name: 'Success' })).toBeVisible();
});
