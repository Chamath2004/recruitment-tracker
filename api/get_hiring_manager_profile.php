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

$hiringManagerId = (int) $_SESSION['hiring_manager_id'];

$stmt = $conn->prepare("SELECT id, first_name, last_name, email, department FROM hiring_managers WHERE id = ?");
$stmt->bind_param("i", $hiringManagerId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Hiring manager not found"]);
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
