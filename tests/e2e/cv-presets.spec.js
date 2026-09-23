const { test, expect } = require('@playwright/test');
const { qaEmail, sqlStr, runSql, hashPassword } = require('./helpers/db');

const password = 'TestPass123!';
let hrId, hrEmail, presetName;

test.beforeAll(async () => {
  const hash = hashPassword(password);
  presetName = 'QA-E2E-Preset-' + Math.random().toString(16).slice(2, 8);
  hrEmail = qaEmail('e2e_cvpreset_hr');
  hrId = runSql(
    `INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'E2EPresetHr', ${sqlStr(hrEmail)}, ${sqlStr(hash)}, 'Human Resources')`
  ).insert_id;
});

test.afterAll(async () => {
  runSql(`DELETE FROM cv_screening_presets WHERE name LIKE 'QA-E2E-Preset-%'`);
  runSql(`DELETE FROM hr_admins WHERE id = ${hrId}`);
});

test('HR can save Auto Filter criteria once and reload them later', async ({ page }) => {
  page.on('dialog', dialog => dialog.accept());

  await page.goto('pages/Login.html');
  await page.fill('#login-email', hrEmail);
  await page.fill('#login-password', password);
  await page.click('.signin-btn');
  await page.waitForURL(/HR\.html/);

  await page.click('#nav-manage-candidates');
  await page.getByRole('button', { name: 'Auto Filter CVs' }).click();

  await page.fill('#cvs-must', 'Playwright, JavaScript');
  await page.fill('#cvs-nice', 'Docker');
  await page.fill('#cvs-years', '4');
  await page.fill('#cvs-preset-name', presetName);
  await page.getByRole('button', { name: /Save Criteria/ }).click();

  // The new entry appears in the dropdown and is selected.
  const presetSelect = page.locator('#cvs-preset-select');
  await expect(presetSelect.locator('option', { hasText: presetName })).toHaveCount(1);
  await expect(page.locator('#cvs-preset-delete-btn')).toBeEnabled();

  // Close and reopen the whole modal: nothing typed carries over, only what was saved.
  await page.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Auto Filter CVs' }).click();
  await expect(page.locator('#cvs-must')).toHaveValue('');

  await page.locator('#cvs-preset-select').selectOption({ label: presetName });
  await expect(page.locator('#cvs-must')).toHaveValue('Playwright, JavaScript');
  await expect(page.locator('#cvs-nice')).toHaveValue('Docker');
  await expect(page.locator('#cvs-years')).toHaveValue('4');

  // Full page reload proves it's stored on the server, not in the browser.
  await page.reload();
  await page.click('#nav-manage-candidates');
  await page.getByRole('button', { name: 'Auto Filter CVs' }).click();
  await expect(page.locator('#cvs-preset-select option', { hasText: presetName })).toHaveCount(1);

  await page.locator('#cvs-preset-select').selectOption({ label: presetName });
  await page.locator('#cvs-preset-delete-btn').click();
  await expect(page.locator('#cvs-preset-select option', { hasText: presetName })).toHaveCount(0);
});
