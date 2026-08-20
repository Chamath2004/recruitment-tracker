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

$stmt = $conn->prepare("SELECT id, first_name, last_name, email, phone, location, linkedin_url, professional_headline FROM candidates WHERE id = ?");
$stmt->bind_param("i", $candidateId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $candidate = $result->fetch_assoc();
    echo json_encode(["success" => true, "data" => $candidate]);
} else {
    echo json_encode(["success" => false, "message" => "Candidate not found"]);
}

$stmt->close();
$conn->close();
?>
