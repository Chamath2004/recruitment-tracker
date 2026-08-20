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

$perJob = [];
$result = $conn->query("SELECT job_title, COUNT(*) AS cnt FROM applications GROUP BY job_title");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $perJob[$row['job_title']] = (int) $row['cnt'];
    }
}

$vacancies = [];
$result = $conn->query("SELECT * FROM vacancies ORDER BY created_at DESC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int) $row['id'];
        $row['applicants'] = $perJob[$row['title']] ?? 0;
        $vacancies[] = $row;
    }
}

echo json_encode(["success" => true, "data" => $vacancies]);

$conn->close();
?>
