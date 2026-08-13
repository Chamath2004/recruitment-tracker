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

$adminId = (int) $_SESSION['hr_admin_id'];
$stmt = $conn->prepare("SELECT google_account_email FROM hr_admins WHERE id = ? AND google_refresh_token IS NOT NULL");
$stmt->bind_param("i", $adminId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();
$conn->close();

if ($row) {
    echo json_encode(["success" => true, "connected" => true, "email" => $row['google_account_email']]);
} else {
    echo json_encode(["success" => true, "connected" => false]);
}
?>
