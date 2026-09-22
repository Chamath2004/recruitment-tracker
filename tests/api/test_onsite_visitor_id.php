<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Onsite interviews get a Visitor ID that is stable across reschedules and cleared if mode changes', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $hrEmail = qa_email('hr');
    $conn->query("INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'HR', '$hrEmail', '$hash', 'Human Resources')");
    $hrId = $conn->insert_id;

    $candEmail = qa_email('candidate');
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'Candidate', '$candEmail', '$hash')");
    $candidateId = $conn->insert_id;

    $conn->query("INSERT INTO applications (candidate_id, job_title, full_name, email, shortlisted) VALUES ($candidateId, 'Backend Engineer', 'QA Candidate', '$candEmail', 1)");
    $applicationId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $hrEmail, 'password' => $password], $cookieJar);

    $scheduled = http_post_json('/api/save_interview.php', [
        'id' => 0, 'application_id' => $applicationId, 'interview_type' => 'Onsite Interview',
        'interview_date' => date('Y-m-d', strtotime('+2 days')), 'interview_time' => '09:00',
        'mode' => 'onsite', 'meeting_link' => 'Level 3, Onyx Tower', 'notes' => '[qa-test]',
    ], $cookieJar);
    assert_true($scheduled['success'] === true, 'Onsite interview is scheduled successfully');
    $interviewId = (int) $scheduled['id'];

    $row1 = $conn->query("SELECT visitor_id, mode FROM interviews WHERE id = $interviewId")->fetch_assoc();
    assert_eq('onsite', $row1['mode'] ?? null, 'Interview is stored with mode=onsite');
    assert_true(!empty($row1['visitor_id']), 'A Visitor ID was generated for the onsite interview');
    assert_true(str_starts_with($row1['visitor_id'], 'AV-'), 'The Visitor ID follows the AV-xxxxxx format');
    $firstVisitorId = $row1['visitor_id'];

    $rescheduled = http_post_json('/api/save_interview.php', [
        'id' => $interviewId, 'application_id' => $applicationId, 'interview_type' => 'Onsite Interview',
        'interview_date' => date('Y-m-d', strtotime('+3 days')), 'interview_time' => '10:00',
        'mode' => 'onsite', 'meeting_link' => 'Level 3, Onyx Tower', 'notes' => '[qa-test]',
    ], $cookieJar);
    assert_true($rescheduled['success'] === true, 'The onsite interview can be rescheduled');

    $row2 = $conn->query("SELECT visitor_id FROM interviews WHERE id = $interviewId")->fetch_assoc();
    assert_eq($firstVisitorId, $row2['visitor_id'] ?? null, 'The Visitor ID stays the same across a reschedule');

    $switchedToVideo = http_post_json('/api/save_interview.php', [
        'id' => $interviewId, 'application_id' => $applicationId, 'interview_type' => 'Onsite Interview',
        'interview_date' => date('Y-m-d', strtotime('+3 days')), 'interview_time' => '10:00',
        'mode' => 'video', 'meeting_link' => '', 'notes' => '[qa-test]',
    ], $cookieJar);
    assert_true($switchedToVideo['success'] === true, 'The interview can be switched to video mode');

    $row3 = $conn->query("SELECT visitor_id, mode FROM interviews WHERE id = $interviewId")->fetch_assoc();
    assert_eq('video', $row3['mode'] ?? null, 'Mode is now video');
    assert_true($row3['visitor_id'] === null, 'The Visitor ID is cleared once the interview is no longer onsite');

    @unlink($cookieJar);
    $conn->query("DELETE FROM interviews WHERE id = $interviewId");
    $conn->query("DELETE FROM applications WHERE id = $applicationId");
    $conn->query("DELETE FROM candidates WHERE id = $candidateId");
    $conn->query("DELETE FROM hr_admins WHERE id = $hrId");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
