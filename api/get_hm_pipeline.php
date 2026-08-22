<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['hiring_manager_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$applications = [];
$result = $conn->query("SELECT id, candidate_id, full_name, email, phone, linkedin, job_title, status, created_at FROM applications WHERE shortlisted = 1 ORDER BY created_at DESC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int) $row['id'];
        $row['candidate_id'] = (int) $row['candidate_id'];
        $applications[] = $row;
    }
}

$vacancies = [];
$result = $conn->query("SELECT id, title FROM vacancies WHERE status = 'active' ORDER BY title ASC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int) $row['id'];
        $vacancies[] = $row;
    }
}

echo json_encode(["success" => true, "data" => $applications, "vacancies" => $vacancies]);

$conn->close();
?>
