<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

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

$interviewId = isset($data['interview_id']) ? (int) $data['interview_id'] : 0;
$action = trim($data['action'] ?? '');

if (!$interviewId || !in_array($action, ['confirm', 'suggest'], true)) {
    echo json_encode(["success" => false, "message" => "A valid interview and action are required."]);
    exit();
}

$stmt = $conn->prepare("SELECT candidate_id, status FROM interviews WHERE id = ?");
$stmt->bind_param("i", $interviewId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Interview not found."]);
    $stmt->close();
    $conn->close();
    exit();
}

$interview = $result->fetch_assoc();
$stmt->close();

if ((int) $interview['candidate_id'] !== $candidateId) {
    echo json_encode(["success" => false, "message" => "Not authorized to update this interview."]);
    $conn->close();
    exit();
}

if ($interview['status'] !== 'scheduled') {
    echo json_encode(["success" => false, "message" => "This interview can no longer be updated."]);
    $conn->close();
    exit();
}

if ($action === 'confirm') {
    $stmt = $conn->prepare("UPDATE interviews SET confirmation_status = 'confirmed', candidate_suggested_date = NULL, candidate_suggested_time = NULL, candidate_note = NULL WHERE id = ?");
    $stmt->bind_param("i", $interviewId);
    $stmt->execute();
    $stmt->close();
} else {
    $suggestedDate = trim($data['suggested_date'] ?? '');
    $suggestedTime = trim($data['suggested_time'] ?? '');
    $note = trim($data['note'] ?? '');

    if (!$suggestedDate || !$suggestedTime) {
        echo json_encode(["success" => false, "message" => "Please provide both a date and a time you'd prefer."]);
        $conn->close();
        exit();
    }

    $stmt = $conn->prepare("UPDATE interviews SET confirmation_status = 'reschedule_requested', candidate_suggested_date = ?, candidate_suggested_time = ?, candidate_note = ? WHERE id = ?");
    $stmt->bind_param("sssi", $suggestedDate, $suggestedTime, $note, $interviewId);
    $stmt->execute();
    $stmt->close();
}

echo json_encode(["success" => true]);

$conn->close();
?>
