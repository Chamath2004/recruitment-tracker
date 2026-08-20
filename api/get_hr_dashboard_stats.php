<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

// Total applications
$totalApplications = 0;
$result = $conn->query("SELECT COUNT(*) AS cnt FROM applications");
if ($result) {
    $totalApplications = (int) $result->fetch_assoc()['cnt'];
}

// Applicants per job title (for the vacancies table)
$perJob = [];
$result = $conn->query("SELECT job_title, COUNT(*) AS cnt FROM applications GROUP BY job_title");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $perJob[$row['job_title']] = (int) $row['cnt'];
    }
}

// Recent applicants
$recentApplicants = [];
$result = $conn->query("SELECT job_title, full_name, email, status, created_at FROM applications ORDER BY created_at DESC LIMIT 5");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $recentApplicants[] = $row;
    }
}

// Active vacancies (for the Active Vacancies table)
$activeVacancies = [];
$result = $conn->query("SELECT title, department, salary FROM vacancies WHERE status = 'active' ORDER BY created_at DESC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['applicants'] = $perJob[$row['title']] ?? 0;
        $activeVacancies[] = $row;
    }
}

// Upcoming interviews (scheduled, today or later)
$upcomingInterviews = [];
$result = $conn->query("SELECT id, candidate_name, job_title, interview_type, interview_date, interview_time, mode FROM interviews WHERE status = 'scheduled' AND interview_date >= CURDATE() ORDER BY interview_date ASC, interview_time ASC LIMIT 5");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int) $row['id'];
        $upcomingInterviews[] = $row;
    }
}

// Total scheduled interviews (for the metric card)
$scheduledInterviewCount = 0;
$result = $conn->query("SELECT COUNT(*) AS cnt FROM interviews WHERE status = 'scheduled'");
if ($result) {
    $scheduledInterviewCount = (int) $result->fetch_assoc()['cnt'];
}

echo json_encode([
    "success" => true,
    "total_applications" => $totalApplications,
    "per_job" => $perJob,
    "recent_applicants" => $recentApplicants,
    "active_vacancies" => $activeVacancies,
    "upcoming_interviews" => $upcomingInterviews,
    "scheduled_interview_count" => $scheduledInterviewCount
]);

$conn->close();
?>
