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

$stmt = $conn->prepare("SELECT id, message, type, is_read, created_at FROM notifications WHERE hiring_manager_id = ? ORDER BY created_at DESC");
$stmt->bind_param("i", $hmId);
$stmt->execute();
$result = $stmt->get_result();

$notifications = [];
$unreadCount = 0;

while ($row = $result->fetch_assoc()) {
    $row['is_read'] = (bool) $row['is_read'];
    if (!$row['is_read']) {
        $unreadCount++;
    }
    $notifications[] = $row;
}

echo json_encode(["success" => true, "data" => $notifications, "unread_count" => $unreadCount]);

$stmt->close();
$conn->close();
?>
