<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "recruitment_tracker");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$applications = [];
$result = $conn->query("SELECT id, candidate_id, full_name, email, job_title, status, created_at FROM applications ORDER BY created_at DESC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int) $row['id'];
        $row['candidate_id'] = (int) $row['candidate_id'];
        $applications[] = $row;
    }
}

echo json_encode(["success" => true, "data" => $applications]);

$conn->close();
?>
