<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "recruitment_tracker");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$adminId = (int) $_SESSION['hr_admin_id'];
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
$assignedInterviewerId = $interviewRow['interviewer_id'] !== null ? (int) $interviewRow['interviewer_id'] : null;

if ($assignedInterviewerId !== null) {
    echo json_encode(["success" => false, "message" => "This interview has an assigned interviewer — feedback must be submitted from the Interviewer Portal."]);
    $conn->close();
    exit();
}

$stmt = $conn->prepare("
    INSERT INTO interview_feedback (interview_id, rating, recommendation, comments, submitted_by)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE rating = VALUES(rating), recommendation = VALUES(recommendation), comments = VALUES(comments), submitted_by = VALUES(submitted_by)
");
$stmt->bind_param("iissi", $interviewId, $rating, $recommendation, $comments, $adminId);
$stmt->execute();
$stmt->close();

echo json_encode(["success" => true]);

$conn->close();
?>
