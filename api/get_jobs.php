<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$perJob = [];
$result = $conn->query("SELECT job_title, COUNT(*) AS cnt FROM applications GROUP BY job_title");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $perJob[$row['job_title']] = (int) $row['cnt'];
    }
}

$myApplied = [];
if (!empty($_SESSION['candidate_id'])) {
    $stmt = $conn->prepare("SELECT DISTINCT job_title FROM applications WHERE candidate_id = ?");
    $stmt->bind_param("i", $_SESSION['candidate_id']);
    $stmt->execute();
    $appliedResult = $stmt->get_result();
    while ($row = $appliedResult->fetch_assoc()) {
        $myApplied[$row['job_title']] = true;
    }
    $stmt->close();
}

$jobs = [];
$result = $conn->query("SELECT * FROM vacancies WHERE status = 'active' ORDER BY created_at DESC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $requirements = array_filter(array_map('trim', explode(',', $row['requirements'] ?? '')));
        $stages = array_filter(array_map('trim', explode(',', $row['pipeline_stages'] ?? '')));
        $hiringProcess = [];
        $i = 1;
        foreach ($stages as $stage) {
            $hiringProcess[] = "$i. $stage";
            $i++;
        }

        $jobs[] = [
            "id" => (int) $row['id'],
            "title" => $row['title'],
            "category" => $row['department'],
            "location" => $row['location'],
            "salary" => $row['salary'],
            "type" => $row['type'],
            "applicants" => ($perJob[$row['title']] ?? 0) . " applicants",
            "alreadyApplied" => isset($myApplied[$row['title']]),
            "description" => $row['description'],
            "requirements" => array_values($requirements),
            "hiringProcess" => $hiringProcess
        ];
    }
}

echo json_encode(["success" => true, "data" => $jobs]);

$conn->close();
?>
