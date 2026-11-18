import { expect, test, type Page } from '@playwright/test';
import { validatedSql } from '../src/sql';

async function project(page: Page, sql: string) {
  await page.getByRole('textbox', { name: 'Repair SQL' }).fill(sql);
  await page.getByRole('button', { name: 'Run projection' }).click();
  await expect(page.getByRole('button', { name: 'Run projection' })).toBeEnabled({
    timeout: 30_000,
  });
}

test('evidence to recovery, replay, export, restore and invalidate', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'The Doppelgänger' })).toBeVisible();
  await page.getByRole('button', { name: 'Investigate incident' }).click();
  await page.getByRole('button', { name: 'E-02 Delivery journal' }).click();
  await page.getByRole('searchbox', { name: 'Filter evidence rows' }).fill('B-019');
  await expect(page.getByRole('cell', { name: 'Timed out' })).toBeVisible();
  await expect(page.getByRole('row')).toHaveCount(3);
  await page.getByRole('button', { name: 'Pin exhibit' }).click();
  await page.getByRole('button', { name: 'Field guide', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal clue 1' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open repair lab' }).click();
  await page.getByRole('button', { name: 'Run projection' }).click();
  await expect(page.getByText('3 repeated rows')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Verify replay' })).toBeDisabled();

  const sql =
    'SELECT transaction_id, amount_fils FROM deliveries\nQUALIFY ROW_NUMBER() OVER (PARTITION BY transaction_id ORDER BY arrival_seq) = 1;';
  await project(page, sql);
  await page.getByRole('button', { name: 'Verify replay' }).click();
  await page.getByRole('button', { name: 'Open shift report' }).click();
  await expect(page.getByRole('heading', { name: 'Recovery verified' })).toBeVisible();
  await expect(page.getByText('A new transaction on a retry')).toBeVisible();
  await expect(page.getByText('AED 10,600,000', { exact: false })).toBeVisible();
  await expect(page.getByText('E-02 · Delivery journal')).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report' }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const part of stream!) chunks.push(Buffer.from(part));
  const report = Buffer.concat(chunks).toString('utf8');
  expect(report).toContain('17 input rows → 8 transactions');
  expect(report).toContain('AED 10,000,000');
  expect(report).toContain('Field guide clues opened: 1');
  expect(report).toContain(sql);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Recovery verified' })).toBeVisible();
  await page.getByRole('link', { name: 'Repair lab' }).click();
  await page.getByRole('button', { name: 'Restore starter' }).click();
  await page.getByRole('link', { name: 'Shift report' }).click();
  await expect(page.getByText('Verification pending')).toBeVisible();
});

test('a plausible first-attempt filter passes the initial ledger and fails the late delivery', async ({
  page,
}) => {
  await page.goto('/#repair');
  await project(page, 'SELECT transaction_id, amount_fils FROM deliveries WHERE attempt = 1');
  await page.getByRole('button', { name: 'Verify replay' }).click();
  await expect(page.getByText('1 missing transaction')).toBeVisible();
  await expect(page.getByText('FAIL', { exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Open shift report' })).toHaveCount(0);
  await project(page, 'SELECT DISTINCT transaction_id, amount_fils FROM deliveries;');
  await page.getByRole('button', { name: 'Verify replay' }).click();
  await expect(page.getByRole('button', { name: 'Open shift report' })).toBeVisible();
});

test('invalid projection is recoverable and a matching total cannot mask a wrong transaction', async ({
  page,
}) => {
  await page.goto('/#repair');
  await project(page, 'SELECT amount_fils FROM deliveries');
  await expect(page.getByRole('alert')).toContainText('exactly two columns');
  await project(
    page,
    'SELECT MIN(transaction_id) AS transaction_id, SUM(amount_fils) AS amount_fils FROM deliveries WHERE attempt = 1',
  );
  await expect(page.getByText('7 missing transactions', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verify replay' })).toBeDisabled();
  await expect(page.getByText('1 output · AED 10,000,000', { exact: false })).toBeVisible();
});

test('mobile navigation, guide and evidence are usable without horizontal page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  for (const name of ['Incident room', 'Evidence', 'Repair lab', 'Shift report']) {
    await page.getByRole('link', { name, exact: true }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.getByRole('button', { name: 'Field guide', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Field guide' })).toBeVisible();
  await page.getByRole('button', { name: 'Reveal clue 1' }).click();
  await page.getByRole('button', { name: 'Inspect record', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Evidence locker' })).toBeVisible();
});

test('only a bounded single-table projection can run', () => {
  for (const invalid of [
    'SELECT * FROM something_else',
    'SELECT * FROM deliveries; SELECT * FROM deliveries',
    'SELECT * FROM deliveries, deliveries',
    'SELECT * FROM (SELECT * FROM deliveries)',
  ]) {
    expect(() => validatedSql(invalid)).toThrow();
  }
});
