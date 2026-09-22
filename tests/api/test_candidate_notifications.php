<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Candidate can see, mark read, and delete their own in-app notifications', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $email = qa_email('notif_candidate');
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'NotifCandidate', '$email', '$hash')");
    $candidateId = $conn->insert_id;

    $otherEmail = qa_email('notif_other_candidate');
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'OtherCandidate', '$otherEmail', '$hash')");
    $otherCandidateId = $conn->insert_id;

    $msg1 = 'Your application for "Backend Engineer" has moved to: In Review.';
    $msg2 = 'Your Technical Interview for Backend Engineer has been scheduled on 2026-10-01 at 10:00.';
    $conn->query("INSERT INTO notifications (candidate_id, message, type) VALUES ($candidateId, '$msg1', 'info')");
    $notif1Id = $conn->insert_id;
    $conn->query("INSERT INTO notifications (candidate_id, message, type) VALUES ($candidateId, '$msg2', 'reminder')");
    $notif2Id = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    $login = http_post_json('/api/login_unified.php', ['email' => $email, 'password' => $password], $cookieJar);
    assert_true($login['success'] === true, 'QA candidate logs in');

    $list = http_get('/api/get_notifications.php', $cookieJar);
    assert_true($list['success'] === true, 'Candidate can fetch their notifications');
    assert_eq(2, count($list['data'] ?? []), 'Both notifications appear in the list');
    assert_eq(2, $list['unread_count'] ?? 0, 'Both notifications are counted as unread — this drives the bell badge on Candidate.html');

    $found1 = null;
    foreach ($list['data'] as $n) {
        if ((int) $n['id'] === $notif1Id) { $found1 = $n; break; }
    }
    assert_true($found1 !== null, 'The status-change notification is present');
    assert_eq($msg1, $found1['message'] ?? null, 'Its message text matches what was written');
    assert_true($found1['is_read'] === false, 'It starts unread');

    $otherJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $otherEmail, 'password' => $password], $otherJar);
    $otherAttempt = http_post_json('/api/mark_notification_read.php', ['id' => $notif1Id], $otherJar);
    assert_true($otherAttempt['success'] === true, 'A different candidate\'s mark-read call does not error (silently no-ops)');
    $stillUnread = $conn->query("SELECT is_read FROM notifications WHERE id = $notif1Id")->fetch_assoc();
    assert_eq(0, (int) $stillUnread['is_read'], 'But it does NOT actually mark another candidate\'s notification as read (ownership enforced)');

    $markRead = http_post_json('/api/mark_notification_read.php', ['id' => $notif1Id], $cookieJar);
    assert_true($markRead['success'] === true, 'The owning candidate can mark their own notification read');

    $afterMark = http_get('/api/get_notifications.php', $cookieJar);
    assert_eq(1, $afterMark['unread_count'] ?? -1, 'Unread count drops to 1 after marking one read');

    $markAll = http_post_json('/api/mark_all_notifications_read.php', [], $cookieJar);
    assert_true($markAll['success'] === true, 'Mark-all-as-read succeeds');
    $afterMarkAll = http_get('/api/get_notifications.php', $cookieJar);
    assert_eq(0, $afterMarkAll['unread_count'] ?? -1, 'Unread count is 0 after marking all read (bell badge would hide)');

    $delete = http_post_json('/api/delete_notification.php', ['id' => $notif2Id], $cookieJar);
    assert_true($delete['success'] === true, 'Candidate can delete a notification');
    $afterDelete = http_get('/api/get_notifications.php', $cookieJar);
    assert_eq(1, count($afterDelete['data'] ?? []), 'The deleted notification no longer appears in the list');

    @unlink($cookieJar);
    @unlink($otherJar);
    $conn->query("DELETE FROM notifications WHERE candidate_id IN ($candidateId, $otherCandidateId)");
    $conn->query("DELETE FROM candidates WHERE id IN ($candidateId, $otherCandidateId)");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
