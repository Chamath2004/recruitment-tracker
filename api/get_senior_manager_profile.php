<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['senior_manager_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$managerId = (int) $_SESSION['senior_manager_id'];

$stmt = $conn->prepare("SELECT id, first_name, last_name, email, department FROM senior_managers WHERE id = ?");
$stmt->bind_param("i", $managerId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $manager = $result->fetch_assoc();
    echo json_encode(["success" => true, "data" => $manager]);
} else {
    echo json_encode(["success" => false, "message" => "Senior manager not found"]);
}

$stmt->close();
$conn->close();
?>
