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

$stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE hiring_manager_id = ?");
$stmt->bind_param("i", $hmId);
$stmt->execute();

echo json_encode(["success" => true]);

$stmt->close();
$conn->close();
?>
