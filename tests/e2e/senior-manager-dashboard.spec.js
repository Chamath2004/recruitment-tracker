const { test, expect } = require('@playwright/test');
const { qaEmail, sqlStr, runSql, hashPassword } = require('./helpers/db');

const password = 'TestPass123!';
let smEmail, smId;

test.beforeAll(async () => {
  const hash = hashPassword(password);
  smEmail = qaEmail('e2e_seniormanager');
  smId = runSql(
    `INSERT INTO senior_managers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'E2ESeniorManager', ${sqlStr(smEmail)}, ${sqlStr(hash)}, 'Executive')`
  ).insert_id;
});

test.afterAll(async () => {
  runSql(`DELETE FROM senior_managers WHERE id = ${smId}`);
});

test('Senior Manager sees the recruitment dashboard KPIs after logging in', async ({ page }) => {
  await page.goto('pages/Login.html');
  await page.fill('#login-email', smEmail);
  await page.fill('#login-password', password);
  await page.click('.signin-btn');
  await page.waitForURL(/SeniorManager\.html/);

  const kpiGrid = page.locator('#dashboard-metric-grid');
  await expect(kpiGrid).toContainText('Total Applications');
  await expect(kpiGrid).toContainText('Active Positions');
  await expect(kpiGrid).toContainText('Total Hires');
  await expect(kpiGrid).toContainText('Hire Rate');
});
