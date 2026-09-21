<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/email_helper.php';

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

$stmt = $conn->prepare("
    SELECT i.candidate_id, i.job_title, i.interview_type, i.interview_date, i.interview_time,
        a.full_name, a.email
    FROM interviews i
    LEFT JOIN applications a ON a.id = i.application_id
    WHERE i.id = ?
");
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

    sendCandidateEmail($interview['email'], $interview['full_name'], "Interview Cancelled - {$interview['job_title']}", "<p>$message</p>");
}

echo json_encode(["success" => true]);

$conn->close();
?>
