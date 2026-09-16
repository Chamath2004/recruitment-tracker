<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

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

$stmt = $conn->prepare("SELECT department FROM interviewers WHERE id = ?");
$stmt->bind_param("i", $interviewerId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Interviewer not found"]);
    $stmt->close();
    $conn->close();
    exit();
}

$department = $result->fetch_assoc()['department'];
$stmt->close();

if (empty($department)) {
    echo json_encode(["success" => true, "data" => [], "department" => null]);
    $conn->close();
    exit();
}

$stmt = $conn->prepare("
    SELECT f.id, f.rating, f.recommendation, f.comments, f.created_at,
        i.candidate_name, i.job_title, i.interview_type, i.interview_date, i.interview_time,
        iv.id AS interviewer_id, iv.first_name AS interviewer_first_name, iv.last_name AS interviewer_last_name
    FROM interview_feedback f
    JOIN interviews i ON i.id = f.interview_id
    JOIN interviewers iv ON iv.id = f.submitted_by_interviewer_id
    WHERE iv.department = ?
    ORDER BY f.created_at DESC
");
$stmt->bind_param("s", $department);
$stmt->execute();
$result = $stmt->get_result();

$feedback = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int) $row['id'];
    $row['rating'] = (int) $row['rating'];
    $row['isOwn'] = ((int) $row['interviewer_id'] === $interviewerId);
    $feedback[] = $row;
}
$stmt->close();

echo json_encode(["success" => true, "data" => $feedback, "department" => $department]);

$conn->close();
?>
