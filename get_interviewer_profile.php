<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['interviewer_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "recruitment_tracker");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$interviewerId = (int) $_SESSION['interviewer_id'];

$stmt = $conn->prepare("SELECT id, first_name, last_name, email, department FROM interviewers WHERE id = ?");
$stmt->bind_param("i", $interviewerId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Interviewer not found"]);
    $stmt->close();
    $conn->close();
    exit();
}

$row = $result->fetch_assoc();
$row['id'] = (int) $row['id'];
$stmt->close();

echo json_encode(["success" => true, "data" => $row]);

$conn->close();
?>
