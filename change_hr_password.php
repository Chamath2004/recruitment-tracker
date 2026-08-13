<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

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
$data = json_decode(file_get_contents("php://input"));

$currentPassword = $data->current_password ?? '';
$newPassword = $data->new_password ?? '';

if ($currentPassword === '' || $newPassword === '') {
    echo json_encode(["success" => false, "message" => "Please fill in both password fields."]);
    $conn->close();
    exit();
}

if (strlen($newPassword) < 8) {
    echo json_encode(["success" => false, "message" => "New password must be at least 8 characters."]);
    $conn->close();
    exit();
}

$stmt = $conn->prepare("SELECT password_hash FROM hr_admins WHERE id = ?");
$stmt->bind_param("i", $adminId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row || !password_verify($currentPassword, $row['password_hash'])) {
    echo json_encode(["success" => false, "message" => "Current password is incorrect."]);
    $conn->close();
    exit();
}

$newHash = password_hash($newPassword, PASSWORD_DEFAULT);
$updateStmt = $conn->prepare("UPDATE hr_admins SET password_hash = ? WHERE id = ?");
$updateStmt->bind_param("si", $newHash, $adminId);
$updateStmt->execute();
$updateStmt->close();

echo json_encode(["success" => true]);

$conn->close();
?>
