const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { qaEmail, sqlStr, runSql, hashPassword } = require('./helpers/db');

const password = 'TestPass123!';
let hrId, hrEmail, candidateId, applicationId, vacancyId, jobTitle;
let resumeFileName, resumeAbsPath;

test.beforeAll(async () => {
  const hash = hashPassword(password);
  jobTitle = 'QA-E2E-Vacancy-CvFilter-' + Math.random().toString(16).slice(2, 8);

  vacancyId = runSql(
    `INSERT INTO vacancies (title, department, location, type, status, requirements) VALUES (${sqlStr(jobTitle)}, 'Engineering', 'Remote', 'Full-time', 'active', 'JavaScript, PHP')`
  ).insert_id;

  hrEmail = qaEmail('e2e_cvs_hr');
  hrId = runSql(
    `INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'E2ECvsHr', ${sqlStr(hrEmail)}, ${sqlStr(hash)}, 'Human Resources')`
  ).insert_id;

  const candidateEmail = qaEmail('e2e_cvs_candidate');
  candidateId = runSql(
    `INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'CvsCandidate', ${sqlStr(candidateEmail)}, ${sqlStr(hash)})`
  ).insert_id;

  resumeFileName = 'qa_e2e_resume_' + Date.now() + '.pdf';
  resumeAbsPath = path.join(__dirname, '..', '..', 'uploads', 'resumes', resumeFileName);
  fs.copyFileSync(path.join(__dirname, 'fixtures', 'qa-resume.pdf'), resumeAbsPath);

  applicationId = runSql(
    `INSERT INTO applications (candidate_id, job_title, full_name, email, status, resume_name, resume_path) VALUES (${candidateId}, ${sqlStr(jobTitle)}, 'QA CvsCandidate', ${sqlStr(candidateEmail)}, 'submitted', ${sqlStr(resumeFileName)}, ${sqlStr(resumeFileName)})`
  ).insert_id;
});

test.afterAll(async () => {
  runSql(`DELETE FROM applications WHERE id = ${applicationId}`);
  runSql(`DELETE FROM candidates WHERE id = ${candidateId}`);
  runSql(`DELETE FROM hr_admins WHERE id = ${hrId}`);
  runSql(`DELETE FROM vacancies WHERE id = ${vacancyId}`);
  fs.rmSync(resumeAbsPath, { force: true });
});

test('HR can run CV auto-screening for a vacancy and shortlist a candidate from the results', async ({ page }) => {
  await page.goto('pages/Login.html');
  await page.fill('#login-email', hrEmail);
  await page.fill('#login-password', password);
  await page.click('.signin-btn');
  await page.waitForURL(/HR\.html/);

  await page.click('#nav-manage-candidates');
  await page.getByRole('button', { name: 'Auto Filter CVs' }).click();

  await page.selectOption('#cvs-vacancy-select', String(vacancyId));
  // Must-Have Skills are no longer pulled from the vacancy: the field stays empty until HR fills it.
  await expect(page.locator('#cvs-must')).toHaveValue('');
  await page.fill('#cvs-must', 'JavaScript, PHP');

  await page.getByRole('button', { name: /Run Screening/ }).click();

  const card = page.locator('.cvs-candidate-card', { hasText: 'QA CvsCandidate' });
  await expect(card).toBeVisible({ timeout: 15000 });

  await card.getByRole('button', { name: 'Shortlist' }).click();
  await expect(card.getByRole('button', { name: 'Already shortlisted' })).toBeVisible();
});
