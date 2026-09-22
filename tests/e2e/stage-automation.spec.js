const { test, expect } = require('@playwright/test');
const { qaEmail, sqlStr, runSql, hashPassword } = require('./helpers/db');

const password = 'TestPass123!';
let hrEmail, hrId;

test.beforeAll(async () => {
  const hash = hashPassword(password);
  hrEmail = qaEmail('e2e_automation_hr');
  hrId = runSql(
    `INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'E2EAutomationHr', ${sqlStr(hrEmail)}, ${sqlStr(hash)}, 'Human Resources')`
  ).insert_id;
});

test.afterAll(async () => {
  runSql(`DELETE FROM hr_admins WHERE id = ${hrId}`);
  // Always leave the shared settings back in their default "on" state,
  // regardless of what this test left them as.
  runSql("UPDATE app_settings SET setting_value = '1'");
});

test('Stage Automation toggles actually flip and persist across a reload', async ({ page }) => {
  await page.goto('pages/Login.html');
  await page.fill('#login-email', hrEmail);
  await page.fill('#login-password', password);
  await page.click('.signin-btn');
  await page.waitForURL(/HR\.html/);

  await page.click('#nav-workflows');

  const emailToggle = page.locator('.automation-row', { hasText: 'Auto-send stage transition emails' }).locator('.toggle-switch');
  await expect(emailToggle).toHaveClass(/\bon\b/);

  await emailToggle.click();
  await expect(emailToggle).not.toHaveClass(/\bon\b/);

  // Reload the whole page — if this were still the old localStorage-only
  // behavior, it would still read "on" here since nothing server-side
  // ever changed. A real reload proves it's now backed by the database.
  await page.reload();
  await page.click('#nav-workflows');

  const emailToggleAfterReload = page.locator('.automation-row', { hasText: 'Auto-send stage transition emails' }).locator('.toggle-switch');
  await expect(emailToggleAfterReload).not.toHaveClass(/\bon\b/);

  // Flip it back on so this test leaves the shared setting as it found it.
  await emailToggleAfterReload.click();
  await expect(emailToggleAfterReload).toHaveClass(/\bon\b/);
});
