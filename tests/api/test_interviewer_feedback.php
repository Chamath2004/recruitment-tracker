<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Interviewer submits feedback for their own completed interview, and only that one', function () {
    $conn = test_db();
    $password = 'TestPass123!';
    $hash = password_hash($password, PASSWORD_DEFAULT);

    $ivEmail = qa_email('interviewer');
    $conn->query("INSERT INTO interviewers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'Interviewer', '$ivEmail', '$hash', 'Engineering')");
    $interviewerId = $conn->insert_id;

    $otherIvEmail = qa_email('other_interviewer');
    $conn->query("INSERT INTO interviewers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'OtherInterviewer', '$otherIvEmail', '$hash', 'Engineering')");
    $otherInterviewerId = $conn->insert_id;

    $hmEmail = qa_email('hiringmanager');
    $conn->query("INSERT INTO hiring_managers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'HM', '$hmEmail', '$hash', 'Engineering')");
    $hmId = $conn->insert_id;

    $candEmail = qa_email('candidate');
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'Candidate', '$candEmail', '$hash')");
    $candidateId = $conn->insert_id;

    $conn->query("INSERT INTO applications (candidate_id, job_title, full_name, email, status) VALUES ($candidateId, 'Backend Engineer', 'QA Candidate', '$candEmail', 'interview')");
    $applicationId = $conn->insert_id;

    $conn->query("INSERT INTO interviews (application_id, candidate_id, candidate_name, job_title, interview_type, interview_date, interview_time, interviewer_id, interviewer, status)
        VALUES ($applicationId, $candidateId, 'QA Candidate', 'Backend Engineer', 'Technical Interview', CURDATE(), '10:00:00', $interviewerId, 'QA Interviewer', 'completed')");
    $interviewId = $conn->insert_id;

    $ivJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $ivEmail, 'password' => $password], $ivJar);
    $otherJar = new_cookie_jar();
    http_post_json('/api/login_unified.php', ['email' => $otherIvEmail, 'password' => $password], $otherJar);

    $wrongInterviewer = http_post_json('/api/save_my_feedback.php', [
        'interview_id' => $interviewId, 'rating' => 4, 'recommendation' => 'yes', 'comments' => '[qa-test]',
    ], $otherJar);
    assert_true($wrongInterviewer['success'] === false, 'An interviewer who was not assigned this interview cannot submit feedback for it');

    $submitted = http_post_json('/api/save_my_feedback.php', [
        'interview_id' => $interviewId, 'rating' => 5, 'recommendation' => 'strong_yes', 'comments' => '[qa-test] great candidate',
    ], $ivJar);
    assert_true($submitted['success'] === true, 'The assigned interviewer can submit feedback');

    $row = $conn->query("SELECT rating, recommendation FROM interview_feedback WHERE interview_id = $interviewId")->fetch_assoc();
    assert_eq(5, (int) ($row['rating'] ?? 0), 'The rating was saved');
    assert_eq('strong_yes', $row['recommendation'] ?? null, 'The recommendation was saved');

    $appRow = $conn->query("SELECT status FROM applications WHERE id = $applicationId")->fetch_assoc();
    assert_eq('in-review', $appRow['status'] ?? null, 'Submitting feedback moves the application to in-review');

    $notif = $conn->query("SELECT COUNT(*) AS c FROM notifications WHERE hiring_manager_id = $hmId")->fetch_assoc();
    assert_true((int) $notif['c'] > 0, 'Hiring managers are notified that feedback was submitted');

    $invalidRating = http_post_json('/api/save_my_feedback.php', [
        'interview_id' => $interviewId, 'rating' => 9, 'recommendation' => 'yes', 'comments' => '',
    ], $ivJar);
    assert_true($invalidRating['success'] === false, 'An out-of-range rating is rejected');

    @unlink($ivJar);
    @unlink($otherJar);
    $conn->query("DELETE FROM notifications WHERE hiring_manager_id = $hmId");
    $conn->query("DELETE FROM interview_feedback WHERE interview_id = $interviewId");
    $conn->query("DELETE FROM interviews WHERE id = $interviewId");
    $conn->query("DELETE FROM applications WHERE id = $applicationId");
    $conn->query("DELETE FROM candidates WHERE id = $candidateId");
    $conn->query("DELETE FROM hiring_managers WHERE id = $hmId");
    $conn->query("DELETE FROM interviewers WHERE id IN ($interviewerId, $otherInterviewerId)");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
