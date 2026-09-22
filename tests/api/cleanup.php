<?php
/**
 * Safety net: removes any leftover test data from the local database.
 * Every test account this suite creates uses an email ending in
 * "@qa.altrium.test", so this can never touch real data.
 * Run manually with: php tests/api/cleanup.php
 */
require_once __DIR__ . '/bootstrap.php';

$conn = test_db();
$domain = '%@' . QA_EMAIL_DOMAIN;

$deletedApplications = 0;
$stmt = $conn->prepare("SELECT id FROM candidates WHERE email LIKE ?");
$stmt->bind_param("s", $domain);
$stmt->execute();
$candidateIds = array_map(fn($r) => (int) $r['id'], $stmt->get_result()->fetch_all(MYSQLI_ASSOC));
$stmt->close();

foreach ($candidateIds as $cid) {
    $conn->query("DELETE FROM interviews WHERE candidate_id = $cid");
    $conn->query("DELETE FROM notifications WHERE candidate_id = $cid");
    $del = $conn->prepare("DELETE FROM applications WHERE candidate_id = ?");
    $del->bind_param("i", $cid);
    $del->execute();
    $deletedApplications += $del->affected_rows;
    $del->close();
}

function qa_ids($conn, $table, $domain) {
    $stmt = $conn->prepare("SELECT id FROM `$table` WHERE email LIKE ?");
    $stmt->bind_param("s", $domain);
    $stmt->execute();
    $ids = array_map(fn($r) => (int) $r['id'], $stmt->get_result()->fetch_all(MYSQLI_ASSOC));
    $stmt->close();
    return $ids;
}

foreach (qa_ids($conn, 'interviewers', $domain) as $ivId) {
    $conn->query("DELETE FROM interview_feedback WHERE submitted_by_interviewer_id = $ivId");
    $conn->query("DELETE FROM interviews WHERE interviewer_id = $ivId");
}

foreach (qa_ids($conn, 'hiring_managers', $domain) as $hmId) {
    $conn->query("DELETE FROM notifications WHERE hiring_manager_id = $hmId");
}

$tables = ['candidates', 'hr_admins', 'interviewers', 'hiring_managers', 'senior_managers'];
$totalUsers = 0;
foreach ($tables as $table) {
    $stmt = $conn->prepare("DELETE FROM `$table` WHERE email LIKE ?");
    $stmt->bind_param("s", $domain);
    $stmt->execute();
    $totalUsers += $stmt->affected_rows;
    $stmt->close();
}

$conn->query("DELETE FROM password_resets WHERE email LIKE '$domain'");
$conn->query("DELETE FROM interview_feedback WHERE comments LIKE '%[qa-test]%'");
$deletedVacancies = $conn->query("DELETE FROM vacancies WHERE title LIKE 'QA-E2E-Vacancy-%'") ? $conn->affected_rows : 0;

echo "Cleanup complete: removed $totalUsers QA account(s), $deletedApplications QA application(s), and $deletedVacancies QA vacancy(ies).\n";
