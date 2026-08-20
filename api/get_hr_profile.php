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

$adminId = (int) $_SESSION['hr_admin_id'];

$stmt = $conn->prepare("SELECT id, first_name, last_name, email, department, role FROM hr_admins WHERE id = ?");
$stmt->bind_param("i", $adminId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $admin = $result->fetch_assoc();
    echo json_encode(["success" => true, "data" => $admin]);
} else {
    echo json_encode(["success" => false, "message" => "Admin not found"]);
}

$stmt->close();
$conn->close();
?>
