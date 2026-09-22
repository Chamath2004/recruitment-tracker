const { test, expect } = require('@playwright/test');
const { registerCandidate } = require('./helpers/api');
const { qaEmail, sqlStr, runSql } = require('./helpers/db');

let email;

test.beforeAll(async () => {
  email = qaEmail('e2e_forgot');
  const result = await registerCandidate({ email, password: 'TestPass123!' });
  if (!result.success) throw new Error('Setup failed: ' + JSON.stringify(result));
});

test.afterAll(async () => {
  runSql(`DELETE FROM password_resets WHERE email = ${sqlStr(email)}`);
  runSql(`DELETE FROM candidates WHERE email = ${sqlStr(email)}`);
});

test('clicking "Forgot password?" swaps to the reset-request view and shows a confirmation', async ({ page }) => {
  await page.goto('pages/Login.html');

  await expect(page.locator('#login-form-view')).toBeVisible();
  await expect(page.locator('#forgot-password-view')).toBeHidden();

  await page.click('.forgot-password');

  await expect(page.locator('#forgot-password-view')).toBeVisible();
  await expect(page.locator('#login-form-view')).toBeHidden();

  await page.fill('#forgot-email', email);
  await page.getByRole('button', { name: 'Send Reset Link' }).click();

  // The real Gmail SMTP send happens synchronously before the API responds
  // (by design — see email_helper.php), so this can take several seconds.
  await expect(page.locator('.form-message.success')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('.form-message.success')).toContainText('reset link has been sent');
});

test('a reset link with an invalid token shows an error, not a crash', async ({ page }) => {
  await page.goto('pages/Login.html?reset_token=not-a-real-token');

  await expect(page.locator('#reset-password-view')).toBeVisible();

  await page.fill('#reset-password', 'NewPassword123!');
  await page.fill('#reset-password-confirm', 'NewPassword123!');
  await page.getByRole('button', { name: 'Update Password' }).click();

  await expect(page.locator('.form-message.error')).toBeVisible();
});
