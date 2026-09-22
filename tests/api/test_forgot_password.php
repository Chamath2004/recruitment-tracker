<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Forgot password: request, reset, and token rules', function () {
    $email = qa_email('resetuser');
    $originalPassword = 'OriginalPass123!';
    $newPassword = 'BrandNewPass456!';
    $conn = test_db();

    http_post_json('/api/register_candidate.php', [
        'first_name' => 'QA', 'last_name' => 'Reset', 'email' => $email, 'password' => $originalPassword,
        'phone' => '', 'location' => '', 'linkedin' => '', 'headline' => '',
    ]);

    $unknownEmail = qa_email('unknown');
    $known = http_post_json('/api/request_password_reset.php', ['email' => $email]);
    $unknown = http_post_json('/api/request_password_reset.php', ['email' => $unknownEmail]);
    assert_true($known['success'] === true, 'Reset request for a known email reports success');
    assert_eq($known['message'], $unknown['message'], 'Known and unknown emails get the identical generic message (no account enumeration)');

    $row = $conn->query("SELECT token, expires_at, used FROM password_resets WHERE email = '" . $conn->real_escape_string($email) . "' ORDER BY id DESC LIMIT 1")->fetch_assoc();
    assert_true($row !== null, 'A reset token row was created for the known email');
    assert_eq(0, (int) ($row['used'] ?? 1), 'The new token is not marked used');

    $token = $row['token'];

    $badReset = http_post_json('/api/reset_password.php', ['token' => 'not-a-real-token', 'password' => $newPassword]);
    assert_true($badReset['success'] === false, 'An invalid token is rejected');

    $goodReset = http_post_json('/api/reset_password.php', ['token' => $token, 'password' => $newPassword]);
    assert_true($goodReset['success'] === true, 'A valid token successfully resets the password');

    $loginOld = http_post_json('/api/login_unified.php', ['email' => $email, 'password' => $originalPassword], new_cookie_jar());
    assert_true($loginOld['success'] === false, 'The old password no longer works after reset');

    $loginNew = http_post_json('/api/login_unified.php', ['email' => $email, 'password' => $newPassword], new_cookie_jar());
    assert_true($loginNew['success'] === true, 'The new password works after reset');

    $reuse = http_post_json('/api/reset_password.php', ['token' => $token, 'password' => 'AnotherPass789!']);
    assert_true($reuse['success'] === false, 'A single-use token cannot be reused');
    assert_true(str_contains($reuse['message'] ?? '', 'already'), 'Reused-token message mentions it was already used');

    $expiredToken = bin2hex(random_bytes(32));
    $past = date('Y-m-d H:i:s', time() - 3600);
    $ins = $conn->prepare("INSERT INTO password_resets (email, role_table, token, expires_at) VALUES (?, 'candidates', ?, ?)");
    $ins->bind_param("sss", $email, $expiredToken, $past);
    $ins->execute();
    $ins->close();

    $expiredResult = http_post_json('/api/reset_password.php', ['token' => $expiredToken, 'password' => 'DoesNotMatter1!']);
    assert_true($expiredResult['success'] === false, 'An expired token is rejected');
    assert_true(str_contains($expiredResult['message'] ?? '', 'expired'), 'Expired-token message mentions expiry');

    $conn->query("DELETE FROM password_resets WHERE email = '" . $conn->real_escape_string($email) . "'");
    $conn->query("DELETE FROM candidates WHERE email = '" . $conn->real_escape_string($email) . "'");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
