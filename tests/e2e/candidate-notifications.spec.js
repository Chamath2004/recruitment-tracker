const { test, expect } = require('@playwright/test');
const { qaEmail, sqlStr, runSql, hashPassword } = require('./helpers/db');

const password = 'TestPass123!';
let email, candidateId;

test.beforeAll(async () => {
  const hash = hashPassword(password);
  email = qaEmail('e2e_notif_candidate');
  candidateId = runSql(
    `INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'E2ENotifCandidate', ${sqlStr(email)}, ${sqlStr(hash)})`
  ).insert_id;

  runSql(
    `INSERT INTO notifications (candidate_id, message, type) VALUES (${candidateId}, 'Your application for "Backend Engineer" has moved to: In Review.', 'info')`
  );
  runSql(
    `INSERT INTO notifications (candidate_id, message, type) VALUES (${candidateId}, 'Your Technical Interview has been scheduled.', 'reminder')`
  );
});

test.afterAll(async () => {
  runSql(`DELETE FROM notifications WHERE candidate_id = ${candidateId}`);
  runSql(`DELETE FROM candidates WHERE id = ${candidateId}`);
});

test('candidate sees an unread badge and can read/mark notifications from the website UI', async ({ page }) => {
  await page.goto('pages/Login.html');
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('.signin-btn');
  await page.waitForURL(/Candidate\.html/);

  const badge = page.locator('#notif-badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText('2');

  await page.click('#nav-notifications');

  await expect(page.getByText('2 unread notifications')).toBeVisible();
  await expect(page.getByText('Your application for "Backend Engineer" has moved to: In Review.')).toBeVisible();
  await expect(page.getByText('Your Technical Interview has been scheduled.')).toBeVisible();

  const firstCard = page.locator('.notif-card').filter({ hasText: 'Backend Engineer' });
  await expect(firstCard).toHaveClass(/unread/);
  await firstCard.locator('.notif-action-btn[title="Mark as read"]').click();

  await expect(page.getByText('1 unread notification')).toBeVisible();
  await expect(badge).toHaveText('1');

  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(page.getByText('All caught up!')).toBeVisible();
  await expect(badge).toBeHidden();
});
