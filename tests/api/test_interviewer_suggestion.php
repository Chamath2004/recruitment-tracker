<?php
require_once __DIR__ . '/bootstrap.php';

test_case('Interviewer department suggestion data + scheduling', function () {
    $conn = test_db();

    $hrEmail = qa_email('hr');
    $hrPassword = 'TestPass123!';
    $hrHash = password_hash($hrPassword, PASSWORD_DEFAULT);
    $conn->query("INSERT INTO hr_admins (first_name, last_name, email, password_hash, department) VALUES ('QA', 'HR', '$hrEmail', '$hrHash', 'Human Resources')");
    $hrId = $conn->insert_id;

    $interviewerEmail = qa_email('interviewer');
    $ivHash = password_hash('TestPass123!', PASSWORD_DEFAULT);
    $conn->query("INSERT INTO interviewers (first_name, last_name, email, password_hash, department) VALUES ('QA', 'Interviewer', '$interviewerEmail', '$ivHash', 'Engineering')");
    $interviewerId = $conn->insert_id;

    $candidateEmail = qa_email('candidate');
    $candHash = password_hash('TestPass123!', PASSWORD_DEFAULT);
    $conn->query("INSERT INTO candidates (first_name, last_name, email, password_hash) VALUES ('QA', 'Applicant', '$candidateEmail', '$candHash')");
    $candidateId = $conn->insert_id;

    $conn->query("INSERT INTO applications (candidate_id, job_title, full_name, email, status, shortlisted) VALUES ($candidateId, 'Backend Engineer', 'QA Applicant', '$candidateEmail', 'in-review', 1)");
    $applicationId = $conn->insert_id;

    $cookieJar = new_cookie_jar();
    $login = http_post_json('/api/login_unified.php', ['email' => $hrEmail, 'password' => $hrPassword], $cookieJar);
    assert_true($login['success'] === true, 'QA HR admin logs in');
    assert_eq('hr', $login['role'] ?? null, 'Login reports role=hr');

    $apps = http_get('/api/get_applications_hr.php', $cookieJar);
    $ourApp = null;
    foreach ($apps['data'] ?? [] as $a) {
        if ((int) $a['id'] === $applicationId) { $ourApp = $a; break; }
    }
    assert_true($ourApp !== null, 'The QA application appears in the shortlisted list');
    assert_eq('Engineering', $ourApp['department'] ?? null, 'The application resolves to the Engineering department');

    $options = http_get('/api/get_interviewer_options.php', $cookieJar);
    $ourInterviewer = null;
    foreach ($options['data'] ?? [] as $o) {
        if ((int) $o['id'] === $interviewerId) { $ourInterviewer = $o; break; }
    }
    assert_true($ourInterviewer !== null, 'The QA interviewer appears in the interviewer options list');
    assert_eq('Engineering', $ourInterviewer['department'] ?? null, 'The interviewer option carries the Engineering department (this is what the UI groups "Recommended" by)');

    $scheduled = http_post_json('/api/save_interview.php', [
        'id' => 0,
        'application_id' => $applicationId,
        'interview_type' => 'Technical Interview',
        'interview_date' => date('Y-m-d', strtotime('+3 days')),
        'interview_time' => '10:00',
        'duration_minutes' => 30,
        'mode' => 'video',
        'interviewer_id' => $interviewerId,
        'meeting_link' => '',
        'notes' => '[qa-test] automated suite',
    ], $cookieJar);
    assert_true($scheduled['success'] === true, 'Scheduling an interview with the department-matched interviewer succeeds');

    $interviewId = (int) ($scheduled['id'] ?? 0);
    $savedRow = $conn->query("SELECT interviewer_id, interviewer FROM interviews WHERE id = $interviewId")->fetch_assoc();
    assert_eq($interviewerId, (int) ($savedRow['interviewer_id'] ?? 0), 'The saved interview record stores the chosen interviewer');
    assert_eq('QA Interviewer', $savedRow['interviewer'] ?? null, 'The saved interview record stores the interviewer\'s name');

    @unlink($cookieJar);
    $conn->query("DELETE FROM interviews WHERE id = $interviewId");
    $conn->query("DELETE FROM applications WHERE id = $applicationId");
    $conn->query("DELETE FROM candidates WHERE id = $candidateId");
    $conn->query("DELETE FROM interviewers WHERE id = $interviewerId");
    $conn->query("DELETE FROM hr_admins WHERE id = $hrId");
});

if (php_sapi_name() === 'cli' && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    exit(print_summary());
}
