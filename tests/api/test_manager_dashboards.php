<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Senior Manager dashboard, breakdown, and analytics endpoints all respond', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $smEmail = qa_email('seniormanager');
    $conn->query("INSERT INTO senior_managers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'SM', '$smEmail', '$hash', 'Executive')");
    $smId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    $login = http_post_json('/api/login_unified.php', ['email' => $smEmail, 'password' => $password], $cookieJar);
    assert_true($login['success'] === true, 'QA senior manager logs in');
    assert_eq('senior_manager', $login['role'] ?? null, 'Login reports role=senior_manager');

    $stats = http_get('/api/get_senior_dashboard_stats.php', $cookieJar);
    assert_true($stats['success'] === true, 'Dashboard stats endpoint responds successfully');

    $breakdown = http_get('/api/get_department_breakdown.php', $cookieJar);
    assert_true($breakdown['success'] === true, 'Department breakdown endpoint responds successfully');
    assert_true(is_array($breakdown['data'] ?? null), 'Department breakdown returns an array of departments');

    $analytics = http_get('/api/get_interview_feedback_analytics.php', $cookieJar);
    assert_true($analytics['success'] === true, 'Interview feedback analytics endpoint responds successfully');

    $noAuth = http_get('/api/get_senior_dashboard_stats.php', new_cookie_jar());
    assert_true($noAuth['success'] === false, 'Dashboard stats require a logged-in senior manager');

    @unlink($cookieJar);
    $conn->query("DELETE FROM senior_managers WHERE id = $smId");
});

test_case('Hiring manager can view completed-interview feedback', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $hmEmail = qa_email('hiringmanager');
    $conn->query("INSERT INTO hiring_managers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'HM', '$hmEmail', '$hash', 'Engineering')");
    $hmId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    $login = http_post_json('/api/login_unified.php', ['email' => $hmEmail, 'password' => $password], $cookieJar);
    assert_true($login['success'] === true, 'QA hiring manager logs in');

    $feedback = http_get('/api/get_hm_feedback.php', $cookieJar);
    assert_true($feedback['success'] === true, 'Hiring manager feedback list endpoint responds successfully');

    @unlink($cookieJar);
    $conn->query("DELETE FROM hiring_managers WHERE id = $hmId");
});

test_case('Interviewer can see their own assigned candidates', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $ivEmail = qa_email('interviewer');
    $conn->query("INSERT INTO interviewers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'Interviewer', '$ivEmail', '$hash', 'Engineering')");
    $interviewerId = $conn->insert_id;

    $candEmail = qa_email('candidate');
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'Candidate', '$candEmail', '$hash')");
    $candidateId = $conn->insert_id;

    $conn->query("INSERT INTO applications (candidate_id, job_title, full_name, email, status) VALUES ($candidateId, 'Backend Engineer', 'QA Candidate', '$candEmail', 'interview')");
    $applicationId = $conn->insert_id;

    $conn->query("INSERT INTO interviews (application_id, candidate_id, candidate_name, job_title, interview_type, interview_date, interview_time, interviewer_id, status)
        VALUES ($applicationId, $candidateId, 'QA Candidate', 'Backend Engineer', 'Technical Interview', CURDATE(), '10:00:00', $interviewerId, 'scheduled')");
    $interviewId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $ivEmail, 'password' => $password], $cookieJar);

    $assigned = http_get('/api/get_assigned_candidates.php', $cookieJar);
    assert_true($assigned['success'] === true, 'Assigned-candidates endpoint responds successfully');

    $found = false;
    foreach ($assigned['data'] ?? [] as $c) {
        if ((int) $c['application_id'] === $applicationId) { $found = true; break; }
    }
    assert_true($found, 'The interviewer sees the candidate assigned to them');

    @unlink($cookieJar);
    $conn->query("DELETE FROM interviews WHERE id = $interviewId");
    $conn->query("DELETE FROM applications WHERE id = $applicationId");
    $conn->query("DELETE FROM candidates WHERE id = $candidateId");
    $conn->query("DELETE FROM interviewers WHERE id = $interviewerId");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
