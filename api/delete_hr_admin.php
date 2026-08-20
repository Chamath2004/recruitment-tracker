<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

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
    echo json_encode(["success" => false, "message" => "You don't have permission to do this."]);
    $conn->close();
    exit();
}

$data = json_decode(file_get_contents("php://input"));
$id = isset($data->id) ? (int) $data->id : 0;

if ($id === 0) {
    echo json_encode(["success" => false, "message" => "Invalid account."]);
    $conn->close();
    exit();
}

if ($id === $currentAdminId) {
    echo json_encode(["success" => false, "message" => "You can't remove your own account."]);
    $conn->close();
    exit();
}

$targetStmt = $conn->prepare("SELECT role FROM hr_admins WHERE id = ?");
$targetStmt->bind_param("i", $id);
$targetStmt->execute();
$target = $targetStmt->get_result()->fetch_assoc();
$targetStmt->close();

if (!$target) {
    echo json_encode(["success" => false, "message" => "Account not found."]);
    $conn->close();
    exit();
}

if ($target['role'] === 'admin') {
    $adminCountResult = $conn->query("SELECT COUNT(*) AS cnt FROM hr_admins WHERE role = 'admin'");
    $adminCount = (int) $adminCountResult->fetch_assoc()['cnt'];
    if ($adminCount <= 1) {
        echo json_encode(["success" => false, "message" => "You can't remove the last remaining admin."]);
        $conn->close();
        exit();
    }
}

$stmt = $conn->prepare("DELETE FROM hr_admins WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$stmt->close();

echo json_encode(["success" => true]);

$conn->close();
?>
