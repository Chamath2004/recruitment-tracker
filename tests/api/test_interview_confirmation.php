<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Candidate confirms or suggests a new interview time', function () {
    $conn = test_db();

    $candEmail = qa_email('candidate');
    $candHash = password_hash('TestPass123!', PASSWORD_DEFAULT);
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'Candidate', '$candEmail', '$candHash')");
    $candidateId = $conn->insert_id;

    $otherEmail = qa_email('other_candidate');
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'Other', '$otherEmail', '$candHash')");
    $otherCandidateId = $conn->insert_id;

    $conn->query("INSERT INTO applications (candidate_id, job_title, full_name, email) VALUES ($candidateId, 'Backend Engineer', 'QA Candidate', '$candEmail')");
    $applicationId = $conn->insert_id;

    $conn->query("INSERT INTO interviews (application_id, candidate_id, candidate_name, job_title, interview_type, interview_date, interview_time, status, confirmation_status)
        VALUES ($applicationId, $candidateId, 'QA Candidate', 'Backend Engineer', 'Technical Interview', CURDATE(), '10:00:00', 'scheduled', 'pending')");
    $interviewId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $candEmail, 'password' => 'TestPass123!'], $cookieJar);

    $otherJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $otherEmail, 'password' => 'TestPass123!'], $otherJar);

    $unauthorized = http_post_json('/api/respond_interview_time.php', ['interview_id' => $interviewId, 'action' => 'confirm'], $otherJar);
    assert_true($unauthorized['success'] === false, 'A candidate cannot confirm someone else\'s interview');

    $missingFields = http_post_json('/api/respond_interview_time.php', ['interview_id' => $interviewId, 'action' => 'suggest'], $cookieJar);
    assert_true($missingFields['success'] === false, 'Suggesting a new time without a date/time is rejected');

    $suggest = http_post_json('/api/respond_interview_time.php', [
        'interview_id' => $interviewId, 'action' => 'suggest',
        'suggested_date' => date('Y-m-d', strtotime('+1 day')), 'suggested_time' => '14:00', 'note' => '[qa-test] prefer afternoon',
    ], $cookieJar);
    assert_true($suggest['success'] === true, 'Candidate can suggest an alternate time');

    $row = $conn->query("SELECT confirmation_status, candidate_suggested_time FROM interviews WHERE id = $interviewId")->fetch_assoc();
    assert_eq('reschedule_requested', $row['confirmation_status'] ?? null, 'Interview is marked as reschedule_requested');
    assert_eq('14:00:00', $row['candidate_suggested_time'] ?? null, 'The suggested time is stored');

    $confirm = http_post_json('/api/respond_interview_time.php', ['interview_id' => $interviewId, 'action' => 'confirm'], $cookieJar);
    assert_true($confirm['success'] === true, 'Candidate can confirm the (originally scheduled) time');

    $row2 = $conn->query("SELECT confirmation_status, candidate_suggested_time FROM interviews WHERE id = $interviewId")->fetch_assoc();
    assert_eq('confirmed', $row2['confirmation_status'] ?? null, 'Interview is now marked confirmed');
    assert_true($row2['candidate_suggested_time'] === null, 'Confirming clears any previously suggested time');

    @unlink($cookieJar);
    @unlink($otherJar);
    $conn->query("DELETE FROM interviews WHERE id = $interviewId");
    $conn->query("DELETE FROM applications WHERE id = $applicationId");
    $conn->query("DELETE FROM candidates WHERE id IN ($candidateId, $otherCandidateId)");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
