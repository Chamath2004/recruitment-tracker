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

$hmId = (int) $_SESSION['hiring_manager_id'];
$data = json_decode(file_get_contents("php://input"), true);
$notifId = (int) ($data['id'] ?? 0);

$stmt = $conn->prepare("DELETE FROM notifications WHERE id = ? AND hiring_manager_id = ?");
$stmt->bind_param("ii", $notifId, $hmId);
$stmt->execute();

echo json_encode(["success" => true]);

$stmt->close();
$conn->close();
?>
