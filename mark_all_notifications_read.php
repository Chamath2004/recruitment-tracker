<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['candidate_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "recruitment_tracker");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$candidateId = (int) $_SESSION['candidate_id'];

$stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE candidate_id = ?");
$stmt->bind_param("i", $candidateId);
$stmt->execute();

echo json_encode(["success" => true]);

$stmt->close();
$conn->close();
?>
