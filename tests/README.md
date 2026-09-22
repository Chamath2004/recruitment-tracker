# Automated tests

Two independent suites. Both need XAMPP's Apache + MySQL running locally
first (`http://localhost/recruitment_tracker/`), and both only ever touch
disposable data — every account/row they create uses an email ending in
`@qa.altrium.test`, so they can never collide with or affect real data.

## 1. Backend API tests (`tests/api/`)

Plain PHP, no Composer/PHPUnit — consistent with the rest of this project
(same reason PHPMailer is vendored by hand). Hits the real `api/*.php`
endpoints over HTTP with curl, asserts on the JSON responses and the
resulting database rows.

```
php tests/api/run.php
```

Covers: candidate registration/login, job application + duplicate
blocking, Forgot Password (request/reset/reuse/expiry rules), the
interviewer department-suggestion data, hiring manager status updates +
notifications, department feedback visibility, candidate interview
confirm/reschedule, interviewer feedback submission (+ authorization
rules + hiring-manager notification), Senior Manager dashboard/breakdown/
analytics endpoints, hiring manager feedback list, interviewer's assigned
candidates, onsite interviews' Visitor ID lifecycle (generated, stable
across reschedule, cleared if mode changes), CV Filter's vacancy data,
and the Google Meet link generator's graceful "not connected" failure.

85 assertions total.

If a run ever crashes mid-test and leaves data behind, clean it up with:

```
php tests/api/cleanup.php
```

## 2. Browser end-to-end tests (`tests/e2e/`)

[Playwright](https://playwright.dev/), driving real Chromium against the
actual pages — catches UI bugs the API tests can't see (broken button
wiring, view-switching, auto-fill behavior).

One-time setup:

```
npm install
npx playwright install chromium
```

Run:

```
npx playwright test          # headless
npx playwright test --headed # watch it click through the UI
```

Covers: login (success + wrong-password error shown on screen), applying
for a job and seeing the duplicate blocked in the UI, the Forgot Password
view-switching + confirmation message, HR scheduling an interview with
the department-recommended interviewer auto-selected, HR running CV
auto-screening and shortlisting a candidate from the results, the Senior
Manager dashboard's KPI cards loading, and scheduling an onsite interview
auto-filling the office address and showing a generated Visitor ID.

9 tests total.

**Not covered by either suite** (would need live external
services/credentials, not something to fake in a test): actual email
arriving in an inbox (we test that sending is *triggered*, via the API
suite — not delivery), and a real Google Calendar OAuth connection for
Meet link generation (the API suite does test the graceful
"not connected" failure path).

Test data setup/teardown shells out to the PHP CLI (`tests/e2e/seed_helper.php`)
rather than using a Node MySQL driver — this project has no other Node
dependencies, and it means passwords are hashed with PHP's own
`password_hash()`, exactly as the app itself does.

## Adding a new test

- **API test**: add `tests/api/test_whatever.php` following the existing
  files — it's picked up automatically by `run.php`.
- **E2E test**: add `tests/e2e/whatever.spec.js` — picked up automatically
  by Playwright.

Always use `qaEmail(...)` / the `@qa.altrium.test` domain for anything you
create, and delete it in an `afterAll`/cleanup step.
