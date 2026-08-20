<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['candidate_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$candidateId = (int) $_SESSION['candidate_id'];
$data = json_decode(file_get_contents("php://input"), true);
$notifId = (int) ($data['id'] ?? 0);

$stmt = $conn->prepare("DELETE FROM notifications WHERE id = ? AND candidate_id = ?");
$stmt->bind_param("ii", $notifId, $candidateId);
$stmt->execute();

echo json_encode(["success" => true]);

$stmt->close();
$conn->close();
?>
