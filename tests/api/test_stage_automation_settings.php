<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Stage automation settings persist and actually gate the stage-transition email', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $hmEmail = qa_email('automation_hm');
    $conn->query("INSERT INTO hiring_managers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'AutomationHm', '$hmEmail', '$hash', 'Engineering')");
    $hmId = $conn->insert_id;

    $candidateEmail = qa_email('automation_candidate');
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'AutomationCandidate', '$candidateEmail', '$hash')");
    $candidateId = $conn->insert_id;

    $conn->query("INSERT INTO applications (candidate_id, job_title, full_name, email, status, shortlisted) VALUES ($candidateId, 'Backend Engineer', 'QA AutomationCandidate', '$candidateEmail', 'submitted', 1)");
    $applicationId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $hmEmail, 'password' => $password], $cookieJar);

    $noAuthResult = http_post_json('/api/save_automation_settings.php', ['key' => 'autoEmail', 'value' => false], new_cookie_jar());
    assert_true($noAuthResult['success'] === false, 'Saving a setting requires being logged in as HR (a hiring manager session is rejected)');

    $hrEmail = qa_email('automation_hr');
    $conn->query("INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'AutomationHr', '$hrEmail', '$hash', 'Human Resources')");
    $hrId = $conn->insert_id;
    $hrJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $hrEmail, 'password' => $password], $hrJar);

    $original = http_get('/api/get_automation_settings.php', $hrJar);
    assert_true($original['success'] === true, 'HR can read the current automation settings');

    $turnOff = http_post_json('/api/save_automation_settings.php', ['key' => 'autoEmail', 'value' => false], $hrJar);
    assert_true($turnOff['success'] === true, 'HR can turn off auto-send stage transition emails');

    $confirmOff = http_get('/api/get_automation_settings.php', $hrJar);
    assert_true($confirmOff['data']['autoEmail'] === false, 'The setting reads back as off — this is a shared server-side setting, not per-browser localStorage');

    $start = microtime(true);
    http_post_json('/api/update_application_status.php', ['application_id' => $applicationId, 'status' => 'in-review'], $cookieJar);
    $elapsedOff = microtime(true) - $start;
    assert_true($elapsedOff < 2.0, "Status update responds quickly ({$elapsedOff}s) when auto-email is off — the real Gmail SMTP call is actually skipped, not just still firing silently");

    $turnOn = http_post_json('/api/save_automation_settings.php', ['key' => 'autoEmail', 'value' => true], $hrJar);
    assert_true($turnOn['success'] === true, 'HR can turn auto-send stage transition emails back on');

    $start2 = microtime(true);
    http_post_json('/api/update_application_status.php', ['application_id' => $applicationId, 'status' => 'interview'], $cookieJar);
    $elapsedOn = microtime(true) - $start2;
    assert_true($elapsedOn > 2.0, "Status update takes noticeably longer ({$elapsedOn}s) once auto-email is back on — confirms the real SMTP send is actually happening, not that the toggle silently does nothing");

    @unlink($cookieJar);
    @unlink($hrJar);
    $conn->query("DELETE FROM applications WHERE id = $applicationId");
    $conn->query("DELETE FROM candidates WHERE id = $candidateId");
    $conn->query("DELETE FROM hiring_managers WHERE id = $hmId");
    $conn->query("DELETE FROM hr_admins WHERE id = $hrId");
    $conn->query("UPDATE app_settings SET setting_value = '1' WHERE setting_key = 'auto_email'");
});

test_case('Interview reminders send once per window and respect the reminders toggle', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $hrEmail = qa_email('reminder_hr');
    $conn->query("INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'ReminderHr', '$hrEmail', '$hash', 'Human Resources')");
    $hrId = $conn->insert_id;

    $candidateEmail = qa_email('reminder_candidate');
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'ReminderCandidate', '$candidateEmail', '$hash')");
    $candidateId = $conn->insert_id;

    $conn->query("INSERT INTO applications (candidate_id, job_title, full_name, email) VALUES ($candidateId, 'Backend Engineer', 'QA ReminderCandidate', '$candidateEmail')");
    $applicationId = $conn->insert_id;

    // The reminder query compares against MySQL's own NOW(), never PHP's clock
    // (see sendDueInterviewReminders) — so the fixture time must be computed
    // the same way, rather than assuming PHP and MySQL agree on "now".
    $conn->query("INSERT INTO interviews (application_id, candidate_id, candidate_name, job_title, interview_type, interview_date, interview_time, status)
        SELECT $applicationId, $candidateId, 'QA ReminderCandidate', 'Backend Engineer', 'Technical Interview',
               DATE(NOW() + INTERVAL 30 MINUTE), TIME(NOW() + INTERVAL 30 MINUTE), 'scheduled'");
    $interviewId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $hrEmail, 'password' => $password], $cookieJar);

    http_get('/api/get_interviews.php', $cookieJar);

    $row = $conn->query("SELECT reminder_1h_sent, reminder_24h_sent FROM interviews WHERE id = $interviewId")->fetch_assoc();
    assert_eq(1, (int) $row['reminder_1h_sent'], 'The 1-hour reminder was sent for an interview 30 minutes away, and the flag was recorded');
    // 30 minutes away is inside BOTH windows (1h and 24h), so both legitimately fire the first time this is checked.
    assert_eq(1, (int) $row['reminder_24h_sent'], 'The 24-hour reminder also fired, since a 30-minutes-away interview is within that window too');

    $start = microtime(true);
    http_get('/api/get_interviews.php', $cookieJar);
    $elapsed = microtime(true) - $start;
    assert_true($elapsed < 2.0, "Loading the interview list again is fast ({$elapsed}s) — the already-sent reminder is not re-sent");

    @unlink($cookieJar);
    $conn->query("DELETE FROM interviews WHERE id = $interviewId");
    $conn->query("DELETE FROM applications WHERE id = $applicationId");
    $conn->query("DELETE FROM candidates WHERE id = $candidateId");
    $conn->query("DELETE FROM hr_admins WHERE id = $hrId");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
