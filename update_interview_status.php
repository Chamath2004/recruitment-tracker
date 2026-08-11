<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "recruitment_tracker");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$id = isset($data['id']) ? (int) $data['id'] : 0;
$status = trim($data['status'] ?? '');

if (!$id || !in_array($status, ['scheduled', 'completed', 'cancelled'], true)) {
    echo json_encode(["success" => false, "message" => "Invalid request."]);
    exit();
}

$stmt = $conn->prepare("SELECT candidate_id, job_title, interview_type, interview_date, interview_time FROM interviews WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Interview not found."]);
    exit();
}

$interview = $result->fetch_assoc();
$stmt->close();

$updateStmt = $conn->prepare("UPDATE interviews SET status = ? WHERE id = ?");
$updateStmt->bind_param("si", $status, $id);
$updateStmt->execute();
$updateStmt->close();

if ($status === 'cancelled') {
    $message = "Your $interview[interview_type] interview for $interview[job_title] on $interview[interview_date] has been cancelled.";
    $candidateId = (int) $interview['candidate_id'];
    $notifStmt = $conn->prepare("INSERT INTO notifications (candidate_id, message, type) VALUES (?, ?, 'warning')");
    $notifStmt->bind_param("is", $candidateId, $message);
    $notifStmt->execute();
    $notifStmt->close();
}

echo json_encode(["success" => true]);

$conn->close();
?>
