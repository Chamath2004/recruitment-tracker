<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Candidate applies for a job, duplicate application is blocked', function () {
    $email = qa_email('applicant');
    $password = 'TestPass123!';
    $conn = test_db();
    $jobTitle = 'Backend Engineer';

    http_post_json('/api/register_candidate.php', [
        'first_name' => 'QA', 'last_name' => 'Applicant', 'email' => $email, 'password' => $password,
        'phone' => '', 'location' => '', 'linkedin' => '', 'headline' => '',
    ]);

    $cookieJar = new_cookie_jar();
    $login = http_post_json('/api/login_unified.php', ['email' => $email, 'password' => $password], $cookieJar);
    assert_true($login['success'] === true, 'QA candidate logs in');

    $apply1 = http_post_multipart('/api/submit_application.php', [
        'jobTitle' => $jobTitle,
        'fullName' => 'QA Applicant',
        'email' => $email,
        'phone' => '0770000001',
        'linkedin' => '',
        'coverLetter' => 'Automated test application.',
    ], $cookieJar);
    assert_true($apply1['success'] === true, 'First application for "' . $jobTitle . '" succeeds');

    $apply2 = http_post_multipart('/api/submit_application.php', [
        'jobTitle' => $jobTitle,
        'fullName' => 'QA Applicant',
        'email' => $email,
        'phone' => '0770000001',
        'linkedin' => '',
        'coverLetter' => 'Second attempt should be blocked.',
    ], $cookieJar);
    assert_true($apply2['success'] === false, 'Second application for the same job is blocked as a duplicate');
    assert_true(
        str_contains($apply2['message'] ?? '', 'already applied'),
        'Duplicate rejection message mentions already having applied'
    );

    $row = $conn->query("SELECT a.id, v.department FROM applications a JOIN vacancies v ON v.title = a.job_title WHERE a.email = '" . $conn->real_escape_string($email) . "'")->fetch_assoc();
    assert_true($row !== null, 'Application row exists and joins to a vacancy');
    assert_eq('Engineering', $row['department'] ?? null, 'Application resolves to the Backend Engineer vacancy\'s Engineering department');

    @unlink($cookieJar);
    $conn->query("DELETE FROM applications WHERE email = '" . $conn->real_escape_string($email) . "'");
    $conn->query("DELETE FROM candidates WHERE email = '" . $conn->real_escape_string($email) . "'");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
