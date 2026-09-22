<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Department feedback shows colleagues\' feedback, marked own vs. colleague', function () {
    $conn = test_db();
    $department = 'QA-Dept-' . substr(md5((string) microtime(true)), 0, 6);

    $ivAHash = password_hash('TestPass123!', PASSWORD_DEFAULT);
    $ivAEmail = qa_email('interviewer_a');
    $conn->query("INSERT INTO interviewers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'InterviewerA', '$ivAEmail', '$ivAHash', '$department')");
    $ivAId = $conn->insert_id;

    $ivBHash = password_hash('TestPass123!', PASSWORD_DEFAULT);
    $ivBEmail = qa_email('interviewer_b');
    $conn->query("INSERT INTO interviewers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'InterviewerB', '$ivBEmail', '$ivBHash', '$department')");
    $ivBId = $conn->insert_id;

    $candEmail = qa_email('candidate');
    $candHash = password_hash('TestPass123!', PASSWORD_DEFAULT);
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'Candidate', '$candEmail', '$candHash')");
    $candidateId = $conn->insert_id;

    $conn->query("INSERT INTO applications (candidate_id, job_title, full_name, email) VALUES ($candidateId, 'Backend Engineer', 'QA Candidate', '$candEmail')");
    $applicationId = $conn->insert_id;

    $conn->query("INSERT INTO interviews (application_id, candidate_id, candidate_name, job_title, interview_type, interview_date, interview_time, interviewer_id, status)
        VALUES ($applicationId, $candidateId, 'QA Candidate', 'Backend Engineer', 'Technical Interview', CURDATE(), '10:00:00', $ivBId, 'completed')");
    $interviewId = $conn->insert_id;

    $conn->query("INSERT INTO interview_feedback (interview_id, rating, recommendation, comments, submitted_by_interviewer_id)
        VALUES ($interviewId, 4, 'yes', '[qa-test] left by colleague B', $ivBId)");
    $feedbackId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    $login = http_post_json('/api/login_unified.php', ['email' => $ivAEmail, 'password' => 'TestPass123!'], $cookieJar);
    assert_true($login['success'] === true, 'QA interviewer A logs in');

    $feedback = http_get('/api/get_department_feedback.php', $cookieJar);
    assert_true($feedback['success'] === true, 'Department feedback request succeeds');
    assert_eq($department, $feedback['department'] ?? null, 'Response reports interviewer A\'s own department');

    $ourEntry = null;
    foreach ($feedback['data'] ?? [] as $f) {
        if ((int) $f['id'] === $feedbackId) { $ourEntry = $f; break; }
    }
    assert_true($ourEntry !== null, 'Interviewer A can see colleague B\'s feedback from the same department');
    assert_true($ourEntry['isOwn'] === false, 'Colleague B\'s feedback is correctly marked as not-own for interviewer A');

    @unlink($cookieJar);
    $conn->query("DELETE FROM interview_feedback WHERE id = $feedbackId");
    $conn->query("DELETE FROM interviews WHERE id = $interviewId");
    $conn->query("DELETE FROM applications WHERE id = $applicationId");
    $conn->query("DELETE FROM candidates WHERE id = $candidateId");
    $conn->query("DELETE FROM interviewers WHERE id IN ($ivAId, $ivBId)");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
