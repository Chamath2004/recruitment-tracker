<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Candidate registration & login', function () {
    $email = qa_email('candidate');
    $password = 'TestPass123!';
    $conn = test_db();

    $result = http_post_json('/api/register_candidate.php', [
        'first_name' => 'QA',
        'last_name' => 'Candidate',
        'email' => $email,
        'password' => $password,
        'phone' => '0770000000',
        'location' => 'Colombo',
        'linkedin' => '',
        'headline' => 'QA Test Candidate',
    ]);
    assert_true($result['success'] === true, 'Registration succeeds for a new email');

    $dupe = http_post_json('/api/register_candidate.php', [
        'first_name' => 'QA',
        'last_name' => 'Candidate',
        'email' => $email,
        'password' => $password,
        'phone' => '', 'location' => '', 'linkedin' => '', 'headline' => '',
    ]);
    assert_true($dupe['success'] === false, 'Registering the same email twice is rejected');

    $cookieJar = new_cookie_jar();
    $login = http_post_json('/api/login_unified.php', ['email' => $email, 'password' => $password], $cookieJar);
    assert_true($login['success'] === true, 'Login succeeds with the correct password');
    assert_eq('candidate', $login['role'] ?? null, 'Login reports role=candidate');

    $badLogin = http_post_json('/api/login_unified.php', ['email' => $email, 'password' => 'WrongPassword!'], new_cookie_jar());
    assert_true($badLogin['success'] === false, 'Login is rejected with the wrong password');

    @unlink($cookieJar);
    $conn->query("DELETE FROM candidates WHERE email = '" . $conn->real_escape_string($email) . "'");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
