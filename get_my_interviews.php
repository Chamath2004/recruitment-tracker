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

$stmt = $conn->prepare("
    SELECT
        i.id, i.candidate_name, i.job_title, i.interview_type, i.interview_date, i.interview_time,
        i.duration_minutes, i.mode, i.meeting_link, i.status,
        f.id AS feedback_id, f.rating, f.recommendation
    FROM interviews i
    LEFT JOIN interview_feedback f ON f.interview_id = i.id
    WHERE i.interviewer_id = ?
    ORDER BY i.interview_date DESC, i.interview_time DESC
");
$stmt->bind_param("i", $interviewerId);
$stmt->execute();
$result = $stmt->get_result();

$interviews = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int) $row['id'];
    $row['duration_minutes'] = (int) $row['duration_minutes'];
    $row['feedback_id'] = $row['feedback_id'] !== null ? (int) $row['feedback_id'] : null;
    $row['rating'] = $row['rating'] !== null ? (int) $row['rating'] : null;
    $interviews[] = $row;
}
$stmt->close();

echo json_encode(["success" => true, "data" => $interviews]);

$conn->close();
?>
