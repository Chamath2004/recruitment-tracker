const path = require('path');
const { test, expect } = require('@playwright/test');
const { registerCandidate } = require('./helpers/api');
const { qaEmail, sqlStr, runSql } = require('./helpers/db');

const password = 'TestPass123!';
const jobTitle = 'Backend Engineer';
let email;

test.beforeAll(async () => {
  email = qaEmail('e2e_apply');
  const result = await registerCandidate({ email, password, firstName: 'QA', lastName: 'E2EApplicant' });
  if (!result.success) throw new Error('Setup failed: ' + JSON.stringify(result));
});

test.afterAll(async () => {
  runSql(`DELETE FROM applications WHERE email = ${sqlStr(email)}`);
  runSql(`DELETE FROM candidates WHERE email = ${sqlStr(email)}`);
});

test('candidate can apply for a job, and a second attempt is blocked as a duplicate', async ({ page }) => {
  await page.goto('pages/Login.html');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('.signin-btn');
  await page.waitForURL(/Candidate\.html/);

  await page.getByText(jobTitle, { exact: false }).first().click();
  await page.getByRole('button', { name: 'Apply Now' }).click();

  await page.fill('#input-fullname', 'QA E2EApplicant');
  await page.fill('#input-email', email);
  await page.fill('#input-phone', '0770000002');
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.setInputFiles('#resume-file-input', path.join(__dirname, 'fixtures', 'qa-resume.pdf'));
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: 'Continue' }).click();

  await page.getByRole('button', { name: 'Submit Application' }).click();
  // submit_application.php sends a real email before responding — always
  // allow real SMTP latency here, not just the default 5s.
  await expect(page.getByText('Application Submitted!')).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: 'Back to Job Board' }).click();
  await page.reload();

  await page.getByText(jobTitle, { exact: false }).first().click();
  const alreadyAppliedBtn = page.getByRole('button', { name: 'Already Applied' });
  await expect(alreadyAppliedBtn).toBeVisible();
  await expect(alreadyAppliedBtn).toBeDisabled();
});
