<?php
require_once __DIR__ . '/bootstrap.php';

test_case('CV Filter vacancy data includes requirements and applicant counts', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $hrEmail = qa_email('hr');
    $conn->query("INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'HR', '$hrEmail', '$hash', 'Human Resources')");
    $hrId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $hrEmail, 'password' => $password], $cookieJar);

    $vacancies = http_get('/api/get_vacancies.php', $cookieJar);
    assert_true($vacancies['success'] === true, 'Vacancies endpoint (used to populate the CV Filter dropdown) responds successfully');

    $backend = null;
    foreach ($vacancies['data'] ?? [] as $v) {
        if ($v['title'] === 'Backend Engineer') { $backend = $v; break; }
    }
    assert_true($backend !== null, 'The Backend Engineer vacancy is present');
    assert_true(array_key_exists('requirements', $backend ?? []), 'Vacancy data includes a requirements field for skill matching');
    assert_true(array_key_exists('applicants', $backend ?? []), 'Vacancy data includes a live applicant count');

    @unlink($cookieJar);
    $conn->query("DELETE FROM hr_admins WHERE id = $hrId");
});

test_case('Generating a Google Meet link fails gracefully when Calendar isn\'t connected', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $hrEmail = qa_email('hr');
    $conn->query("INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'HR', '$hrEmail', '$hash', 'Human Resources')");
    $hrId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $hrEmail, 'password' => $password], $cookieJar);

    $result = http_post_json('/api/generate_meet_link.php', [
        'interview_date' => date('Y-m-d', strtotime('+1 day')),
        'interview_time' => '10:00',
        'duration_minutes' => 30,
        'interview_type' => 'Technical Interview',
        'candidate_name' => 'QA Candidate',
    ], $cookieJar);

    assert_true($result['success'] === false, 'Meet link generation fails when this QA HR account has no Google Calendar connected');
    assert_true(($result['not_connected'] ?? false) === true, 'The failure is reported as "not_connected", not a generic/crashing error');

    @unlink($cookieJar);
    $conn->query("DELETE FROM hr_admins WHERE id = $hrId");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
