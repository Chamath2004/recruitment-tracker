const { test, expect } = require('@playwright/test');
const { qaEmail, sqlStr, runSql, hashPassword } = require('./helpers/db');

const password = 'TestPass123!';
let hrEmail, hrId, interviewerId, candidateId, applicationId, vacancyId, department, jobTitle;

test.beforeAll(async () => {
  const hash = hashPassword(password);
  department = 'QA-Dept-' + Math.random().toString(16).slice(2, 8);
  jobTitle = 'QA-E2E-Vacancy-Schedule-' + Math.random().toString(16).slice(2, 8);

  // A dedicated disposable vacancy + department, so this test's "which
  // interviewer gets suggested" assertion can't collide with real
  // interviewers who already happen to share a department like "Engineering".
  vacancyId = runSql(
    `INSERT INTO vacancies (title, department, location, type, status) VALUES (${sqlStr(jobTitle)}, ${sqlStr(department)}, 'Remote', 'Full-time', 'active')`
  ).insert_id;

  hrEmail = qaEmail('e2e_hr');
  hrId = runSql(
    `INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'E2EHr', ${sqlStr(hrEmail)}, ${sqlStr(hash)}, 'Human Resources')`
  ).insert_id;

  const interviewerEmail = qaEmail('e2e_interviewer');
  interviewerId = runSql(
    `INSERT INTO interviewers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'E2EInterviewer', ${sqlStr(interviewerEmail)}, ${sqlStr(hash)}, ${sqlStr(department)})`
  ).insert_id;

  const candidateEmail = qaEmail('e2e_candidate');
  candidateId = runSql(
    `INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'E2ECandidate', ${sqlStr(candidateEmail)}, ${sqlStr(hash)})`
  ).insert_id;

  applicationId = runSql(
    `INSERT INTO applications (candidate_id, job_title, full_name, email, status, shortlisted) VALUES (${candidateId}, ${sqlStr(jobTitle)}, 'QA E2ECandidate', ${sqlStr(candidateEmail)}, 'in-review', 1)`
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

test('HR schedules an interview and the department-matched interviewer is auto-selected', async ({ page }) => {
  await page.goto('pages/Login.html');
  await page.fill('#login-email', hrEmail);
  await page.fill('#login-password', password);
  await page.click('.signin-btn');
  await page.waitForURL(/HR\.html/);

  await page.click('#nav-interviews');
  await page.getByRole('button', { name: 'Schedule Interview' }).click();

  await expect(page.locator('#interview-modal-overlay')).toBeVisible();

  await page.selectOption('#if-application', { label: `QA E2ECandidate — ${jobTitle}` });
  await page.fill('#if-type', 'Technical Interview');

  const futureDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  await page.fill('#if-date', futureDate);
  await page.fill('#if-time', '11:00');

  const interviewerValue = await page.locator('#if-interviewer').inputValue();
  expect(interviewerValue).toBe(String(interviewerId));

  await page.locator('#interview-modal-overlay').getByRole('button', { name: 'Schedule Interview' }).click();

  await expect(page.locator('#interview-modal-overlay')).toHaveCount(0);
});
