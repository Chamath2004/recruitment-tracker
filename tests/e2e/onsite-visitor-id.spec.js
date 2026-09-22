const { test, expect } = require('@playwright/test');
const { qaEmail, sqlStr, runSql, hashPassword } = require('./helpers/db');

const password = 'TestPass123!';
let hrEmail, hrId, interviewerId, candidateId, applicationId, vacancyId, department, jobTitle;

test.beforeAll(async () => {
  const hash = hashPassword(password);
  department = 'QA-Onsite-' + Math.random().toString(16).slice(2, 8);
  jobTitle = 'QA-E2E-Vacancy-Onsite-' + Math.random().toString(16).slice(2, 8);

  vacancyId = runSql(
    `INSERT INTO vacancies (title, department, location, type, status) VALUES (${sqlStr(jobTitle)}, ${sqlStr(department)}, 'Colombo', 'Full-time', 'active')`
  ).insert_id;

  hrEmail = qaEmail('e2e_onsite_hr');
  hrId = runSql(
    `INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'E2EOnsiteHr', ${sqlStr(hrEmail)}, ${sqlStr(hash)}, 'Human Resources')`
  ).insert_id;

  const interviewerEmail = qaEmail('e2e_onsite_interviewer');
  interviewerId = runSql(
    `INSERT INTO interviewers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'E2EOnsiteInterviewer', ${sqlStr(interviewerEmail)}, ${sqlStr(hash)}, ${sqlStr(department)})`
  ).insert_id;

  const candidateEmail = qaEmail('e2e_onsite_candidate');
  candidateId = runSql(
    `INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'E2EOnsiteCandidate', ${sqlStr(candidateEmail)}, ${sqlStr(hash)})`
  ).insert_id;

  applicationId = runSql(
    `INSERT INTO applications (candidate_id, job_title, full_name, email, status, shortlisted) VALUES (${candidateId}, ${sqlStr(jobTitle)}, 'QA E2EOnsiteCandidate', ${sqlStr(candidateEmail)}, 'in-review', 1)`
  ).insert_id;
});

test.afterAll(async () => {
  runSql(`DELETE FROM interviews WHERE application_id = ${applicationId}`);
  runSql(`DELETE FROM applications WHERE id = ${applicationId}`);
  runSql(`DELETE FROM candidates WHERE id = ${candidateId}`);
  runSql(`DELETE FROM interviewers WHERE id = ${interviewerId}`);
  runSql(`DELETE FROM hr_admins WHERE id = ${hrId}`);
  runSql(`DELETE FROM vacancies WHERE id = ${vacancyId}`);
});

test('scheduling an onsite interview auto-fills the office address and shows a Visitor ID in the list', async ({ page }) => {
  await page.goto('pages/Login.html');
  await page.fill('#login-email', hrEmail);
  await page.fill('#login-password', password);
  await page.click('.signin-btn');
  await page.waitForURL(/HR\.html/);

  await page.click('#nav-interviews');
  await page.getByRole('button', { name: 'Schedule Interview' }).click();

  await page.selectOption('#if-application', { label: `QA E2EOnsiteCandidate — ${jobTitle}` });
  await page.fill('#if-type', 'Onsite Interview');

  const futureDate = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
  await page.fill('#if-date', futureDate);
  await page.fill('#if-time', '13:00');

  await page.selectOption('#if-mode', 'onsite');
  await expect(page.locator('#if-link')).toHaveValue(/Onyx Tower/);

  await page.locator('#interview-modal-overlay').getByRole('button', { name: 'Schedule Interview' }).click();
  // save_interview.php sends a real "Interview Scheduled" email before
  // responding — always allow real SMTP latency here.
  await expect(page.locator('#interview-modal-overlay')).toHaveCount(0, { timeout: 15000 });

  const row = page.locator('#interviews-table-body tr', { hasText: 'QA E2EOnsiteCandidate' });
  await expect(row).toContainText('Visitor ID:');
  await expect(row).toContainText(/AV-[A-F0-9]{6}/);
});
