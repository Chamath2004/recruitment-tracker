const { test, expect } = require('@playwright/test');
const { registerCandidate } = require('./helpers/api');
const { qaEmail, sqlStr, runSql } = require('./helpers/db');

const password = 'TestPass123!';
let email;

test.beforeAll(async () => {
  email = qaEmail('e2e_login');
  const result = await registerCandidate({ email, password });
  if (!result.success) throw new Error('Setup failed: ' + JSON.stringify(result));
});

test.afterAll(async () => {
  runSql(`DELETE FROM candidates WHERE email = ${sqlStr(email)}`);
});

test('candidate can log in with the correct password and lands on their dashboard', async ({ page }) => {
  await page.goto('pages/Login.html');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('.signin-btn');

  await page.waitForURL(/Candidate\.html/);
  await expect(page).toHaveURL(/Candidate\.html/);
});

test('an incorrect password shows an error and does not navigate away', async ({ page }) => {
  await page.goto('pages/Login.html');

  let dialogMessage = '';
  page.once('dialog', async (dialog) => {
    dialogMessage = dialog.message();
    await dialog.accept();
  });

  await page.fill('#login-email', email);
  await page.fill('#login-password', 'DefinitelyWrongPassword!');
  await page.click('.signin-btn');

  await page.waitForTimeout(500);
  expect(dialogMessage.toLowerCase()).toContain('invalid');
  await expect(page).toHaveURL(/Login\.html/);
});
