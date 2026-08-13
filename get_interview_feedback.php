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

$sql = "SELECT
            i.id, i.candidate_name, i.job_title, i.interview_type, i.interview_date, i.interview_time,
            i.interviewer, i.interviewer_id, i.mode,
            f.id AS feedback_id, f.rating, f.recommendation, f.comments, f.updated_at AS feedback_updated_at,
            CONCAT(a.first_name, ' ', a.last_name) AS submitted_by_name
        FROM interviews i
        LEFT JOIN interview_feedback f ON f.interview_id = i.id
        LEFT JOIN hr_admins a ON a.id = f.submitted_by
        WHERE i.status = 'completed'
        ORDER BY i.interview_date DESC, i.interview_time DESC";

$result = $conn->query($sql);

$rows = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int) $row['id'];
    $row['interviewer_id'] = $row['interviewer_id'] !== null ? (int) $row['interviewer_id'] : null;
    $row['feedback_id'] = $row['feedback_id'] !== null ? (int) $row['feedback_id'] : null;
    $row['rating'] = $row['rating'] !== null ? (int) $row['rating'] : null;
    $rows[] = $row;
}

echo json_encode(["success" => true, "data" => $rows]);

$conn->close();
?>
