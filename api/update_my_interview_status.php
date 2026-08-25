<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

if (empty($_SESSION['interviewer_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$interviewerId = (int) $_SESSION['interviewer_id'];
$data = json_decode(file_get_contents("php://input"), true);
$id = isset($data['id']) ? (int) $data['id'] : 0;

if (!$id) {
    echo json_encode(["success" => false, "message" => "Invalid request."]);
    $conn->close();
    exit();
}

$stmt = $conn->prepare("SELECT interviewer_id, status FROM interviews WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    $stmt->close();
    echo json_encode(["success" => false, "message" => "Interview not found."]);
    $conn->close();
    exit();
}

$interview = $result->fetch_assoc();
$stmt->close();

if ((int) $interview['interviewer_id'] !== $interviewerId) {
    echo json_encode(["success" => false, "message" => "This interview isn't assigned to you."]);
    $conn->close();
    exit();
}

if ($interview['status'] !== 'scheduled') {
    echo json_encode(["success" => false, "message" => "This interview is already marked as {$interview['status']}."]);
    $conn->close();
    exit();
}

$updateStmt = $conn->prepare("UPDATE interviews SET status = 'completed' WHERE id = ?");
$updateStmt->bind_param("i", $id);
$updateStmt->execute();
$updateStmt->close();

echo json_encode(["success" => true]);

$conn->close();
?>
