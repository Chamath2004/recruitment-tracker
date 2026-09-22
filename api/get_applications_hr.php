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

$applications = [];
$result = $conn->query("
    SELECT a.id, a.candidate_id, a.full_name, a.email, a.job_title, a.status, a.created_at, v.department
    FROM applications a
    LEFT JOIN vacancies v ON v.title = a.job_title
    WHERE a.shortlisted = 1
    ORDER BY a.created_at DESC
");
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
