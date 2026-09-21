<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$token = trim($data['token'] ?? '');
$newPassword = $data['password'] ?? '';

if (!$token || strlen($newPassword) < 6) {
    echo json_encode(["success" => false, "message" => "A valid link and a password of at least 6 characters are required."]);
    exit();
}

$stmt = $conn->prepare("SELECT id, email, role_table, expires_at, used FROM password_resets WHERE token = ?");
$stmt->bind_param("s", $token);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "This reset link is invalid."]);
    $stmt->close();
    $conn->close();
    exit();
}

$row = $result->fetch_assoc();
$stmt->close();

if ((int) $row['used'] === 1) {
    echo json_encode(["success" => false, "message" => "This reset link has already been used."]);
    $conn->close();
    exit();
}

if (strtotime($row['expires_at']) < time()) {
    echo json_encode(["success" => false, "message" => "This reset link has expired. Please request a new one."]);
    $conn->close();
    exit();
}

$allowedTables = ['candidates', 'hr_admins', 'interviewers', 'hiring_managers', 'senior_managers'];
if (!in_array($row['role_table'], $allowedTables, true)) {
    echo json_encode(["success" => false, "message" => "Invalid reset request."]);
    $conn->close();
    exit();
}

$table = $row['role_table'];
$hash = password_hash($newPassword, PASSWORD_DEFAULT);

$updateStmt = $conn->prepare("UPDATE `$table` SET password_hash = ? WHERE email = ?");
$updateStmt->bind_param("ss", $hash, $row['email']);
$updateStmt->execute();
$updateStmt->close();

$markUsedStmt = $conn->prepare("UPDATE password_resets SET used = 1 WHERE id = ?");
$markUsedStmt->bind_param("i", $row['id']);
$markUsedStmt->execute();
$markUsedStmt->close();

echo json_encode(["success" => true, "message" => "Your password has been updated. You can now log in."]);

$conn->close();
?>
