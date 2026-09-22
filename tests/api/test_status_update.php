<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Hiring manager status update requires shortlisting and notifies the candidate', function () {
    $conn = test_db();

    $hmEmail = qa_email('hiringmanager');
    $hmHash = password_hash('TestPass123!', PASSWORD_DEFAULT);
    $conn->query("INSERT INTO hiring_managers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'HiringManager', '$hmEmail', '$hmHash', 'Engineering')");
    $hmId = $conn->insert_id;

    $candidateEmail = qa_email('candidate');
    $candHash = password_hash('TestPass123!', PASSWORD_DEFAULT);
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'Applicant', '$candidateEmail', '$candHash')");
    $candidateId = $conn->insert_id;

    $conn->query("INSERT INTO applications (candidate_id, job_title, full_name, email, status, shortlisted) VALUES ($candidateId, 'Backend Engineer', 'QA Applicant', '$candidateEmail', 'submitted', 0)");
    $applicationId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    $login = http_post_json('/api/login_unified.php', ['email' => $hmEmail, 'password' => 'TestPass123!'], $cookieJar);
    assert_true($login['success'] === true, 'QA hiring manager logs in');
    assert_eq('hiring_manager', $login['role'] ?? null, 'Login reports role=hiring_manager');

    $blocked = http_post_json('/api/update_application_status.php', ['application_id' => $applicationId, 'status' => 'interview'], $cookieJar);
    assert_true($blocked['success'] === false, 'Status update is blocked before HR shortlists the candidate');

    $conn->query("UPDATE applications SET shortlisted = 1 WHERE id = $applicationId");

    $allowed = http_post_json('/api/update_application_status.php', ['application_id' => $applicationId, 'status' => 'interview'], $cookieJar);
    assert_true($allowed['success'] === true, 'Status update succeeds once the candidate is shortlisted');

    $row = $conn->query("SELECT status FROM applications WHERE id = $applicationId")->fetch_assoc();
    assert_eq('interview', $row['status'] ?? null, 'Application status is persisted as "interview"');

    $notif = $conn->query("SELECT COUNT(*) AS c FROM notifications WHERE candidate_id = $candidateId")->fetch_assoc();
    assert_true((int) $notif['c'] > 0, 'An in-app notification was created for the candidate');

    $invalidStatus = http_post_json('/api/update_application_status.php', ['application_id' => $applicationId, 'status' => 'not-a-real-status'], $cookieJar);
    assert_true($invalidStatus['success'] === false, 'An unrecognized status value is rejected');

    @unlink($cookieJar);
    $conn->query("DELETE FROM notifications WHERE candidate_id = $candidateId");
    $conn->query("DELETE FROM applications WHERE id = $applicationId");
    $conn->query("DELETE FROM candidates WHERE id = $candidateId");
    $conn->query("DELETE FROM hiring_managers WHERE id = $hmId");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
