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
$data = json_decode(file_get_contents("php://input"));

$interviewId = (int) ($data->interview_id ?? 0);
$rating = (int) ($data->rating ?? 0);
$recommendation = $data->recommendation ?? '';
$comments = trim($data->comments ?? '');

$validRecommendations = ['strong_yes', 'yes', 'no', 'strong_no'];

if ($interviewId <= 0 || $rating < 1 || $rating > 5 || !in_array($recommendation, $validRecommendations, true)) {
    echo json_encode(["success" => false, "message" => "Please provide a rating and a recommendation."]);
    $conn->close();
    exit();
}

$interviewStmt = $conn->prepare("SELECT interviewer_id FROM interviews WHERE id = ? AND status = 'completed'");
$interviewStmt->bind_param("i", $interviewId);
$interviewStmt->execute();
$interviewResult = $interviewStmt->get_result();

if ($interviewResult->num_rows === 0) {
    $interviewStmt->close();
    echo json_encode(["success" => false, "message" => "This interview isn't marked as completed."]);
    $conn->close();
    exit();
}

$interviewRow = $interviewResult->fetch_assoc();
$interviewStmt->close();

if ((int) $interviewRow['interviewer_id'] !== $interviewerId) {
    echo json_encode(["success" => false, "message" => "This interview isn't assigned to you."]);
    $conn->close();
    exit();
}

$stmt = $conn->prepare("
    INSERT INTO interview_feedback (interview_id, rating, recommendation, comments, submitted_by_interviewer_id)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE rating = VALUES(rating), recommendation = VALUES(recommendation), comments = VALUES(comments), submitted_by_interviewer_id = VALUES(submitted_by_interviewer_id)
");
$stmt->bind_param("iissi", $interviewId, $rating, $recommendation, $comments, $interviewerId);
$stmt->execute();
$stmt->close();

echo json_encode(["success" => true]);

$conn->close();
?>
