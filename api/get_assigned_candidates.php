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

$stmt = $conn->prepare("
    SELECT
        a.id AS application_id, a.full_name, a.email, a.phone, a.linkedin, a.resume_name, a.resume_path, a.status, a.job_title,
        i.interview_date, i.interview_time, i.interview_type
    FROM interviews i
    JOIN applications a ON a.id = i.application_id
    WHERE i.interviewer_id = ?
    ORDER BY a.id, i.interview_date DESC, i.interview_time DESC
");
$stmt->bind_param("i", $interviewerId);
$stmt->execute();
$result = $stmt->get_result();

$candidates = [];
$jobTitles = [];

while ($row = $result->fetch_assoc()) {
    $appId = (int) $row['application_id'];

    if (!isset($candidates[$appId])) {
        $candidates[$appId] = [
            "application_id" => $appId,
            "full_name" => $row['full_name'] && trim($row['full_name']) !== '' ? $row['full_name'] : $row['email'],
            "email" => $row['email'],
            "phone" => $row['phone'],
            "linkedin" => $row['linkedin'],
            "resume_name" => $row['resume_name'],
            "resume_path" => $row['resume_path'],
            "status" => $row['status'],
            "job_title" => $row['job_title'],
            "interviews" => []
        ];
    }

    $candidates[$appId]['interviews'][] = [
        "date" => $row['interview_date'],
        "time" => $row['interview_time'],
        "type" => $row['interview_type']
    ];

    if (!in_array($row['job_title'], $jobTitles)) {
        $jobTitles[] = $row['job_title'];
    }
}
$stmt->close();

echo json_encode([
    "success" => true,
    "data" => array_values($candidates),
    "assigned_positions" => $jobTitles
]);

$conn->close();
?>
