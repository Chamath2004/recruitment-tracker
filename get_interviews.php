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

$interviews = [];
$result = $conn->query("SELECT * FROM interviews ORDER BY interview_date ASC, interview_time ASC");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int) $row['id'];
        $row['application_id'] = (int) $row['application_id'];
        $row['candidate_id'] = (int) $row['candidate_id'];
        $row['duration_minutes'] = (int) $row['duration_minutes'];
        $interviews[] = $row;
    }
}

echo json_encode(["success" => true, "data" => $interviews]);

$conn->close();
?>
