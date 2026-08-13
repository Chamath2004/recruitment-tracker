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

$currentAdminId = (int) $_SESSION['hr_admin_id'];

$roleStmt = $conn->prepare("SELECT role FROM hr_admins WHERE id = ?");
$roleStmt->bind_param("i", $currentAdminId);
$roleStmt->execute();
$currentAdmin = $roleStmt->get_result()->fetch_assoc();
$roleStmt->close();

if (!$currentAdmin || $currentAdmin['role'] !== 'admin') {
    echo json_encode(["success" => false, "message" => "You don't have permission to view this."]);
    $conn->close();
    exit();
}

$result = $conn->query("SELECT id, first_name, last_name, email, department, created_at FROM interviewers ORDER BY first_name, last_name");

$interviewers = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int) $row['id'];
    $interviewers[] = $row;
}

echo json_encode(["success" => true, "data" => $interviewers]);

$conn->close();
?>
