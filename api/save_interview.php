<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

$id = isset($data['id']) ? (int) $data['id'] : 0;
$applicationId = isset($data['application_id']) ? (int) $data['application_id'] : 0;
$interviewType = trim($data['interview_type'] ?? '');
$interviewDate = trim($data['interview_date'] ?? '');
$interviewTime = trim($data['interview_time'] ?? '');
$duration = isset($data['duration_minutes']) ? (int) $data['duration_minutes'] : 30;
$interviewerId = isset($data['interviewer_id']) && $data['interviewer_id'] ? (int) $data['interviewer_id'] : null;
$mode = trim($data['mode'] ?? 'video');
$meetingLink = trim($data['meeting_link'] ?? '');
$notes = trim($data['notes'] ?? '');

if (!$applicationId || !$interviewType || !$interviewDate || !$interviewTime) {
    echo json_encode(["success" => false, "message" => "Candidate, interview type, date, and time are required."]);
    exit();
}

$appStmt = $conn->prepare("SELECT candidate_id, full_name, email, job_title FROM applications WHERE id = ?");
$appStmt->bind_param("i", $applicationId);
$appStmt->execute();
$appResult = $appStmt->get_result();

if ($appResult->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Selected application no longer exists."]);
    exit();
}

$app = $appResult->fetch_assoc();
$appStmt->close();

$candidateId = (int) $app['candidate_id'];
$candidateName = $app['full_name'] && trim($app['full_name']) !== '' ? $app['full_name'] : $app['email'];
$jobTitle = $app['job_title'];

$interviewerName = '';
if ($interviewerId) {
    $staffStmt = $conn->prepare("SELECT first_name, last_name FROM interviewers WHERE id = ?");
    $staffStmt->bind_param("i", $interviewerId);
    $staffStmt->execute();
    $staffResult = $staffStmt->get_result();
    if ($staffResult->num_rows > 0) {
        $staff = $staffResult->fetch_assoc();
        $interviewerName = trim($staff['first_name'] . ' ' . $staff['last_name']);
    } else {
        $interviewerId = null;
    }
    $staffStmt->close();
}

if ($id) {
    $stmt = $conn->prepare("UPDATE interviews SET interview_type = ?, interview_date = ?, interview_time = ?, duration_minutes = ?, interviewer = ?, interviewer_id = ?, mode = ?, meeting_link = ?, notes = ? WHERE id = ?");
    $stmt->bind_param("sssisisssi", $interviewType, $interviewDate, $interviewTime, $duration, $interviewerName, $interviewerId, $mode, $meetingLink, $notes, $id);
    $stmt->execute();
    $stmt->close();

    $message = "Your $interviewType interview for $jobTitle has been rescheduled to $interviewDate at $interviewTime.";
} else {
    $stmt = $conn->prepare("INSERT INTO interviews (application_id, candidate_id, candidate_name, job_title, interview_type, interview_date, interview_time, duration_minutes, interviewer, interviewer_id, mode, meeting_link, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')");
    $stmt->bind_param("iisssssisisss", $applicationId, $candidateId, $candidateName, $jobTitle, $interviewType, $interviewDate, $interviewTime, $duration, $interviewerName, $interviewerId, $mode, $meetingLink, $notes);

    $stmt->execute();
    $id = $conn->insert_id;
    $stmt->close();

    $message = "Your $interviewType interview for $jobTitle has been scheduled on $interviewDate at $interviewTime.";
}

$notifStmt = $conn->prepare("INSERT INTO notifications (candidate_id, message, type) VALUES (?, ?, 'reminder')");
$notifStmt->bind_param("is", $candidateId, $message);
$notifStmt->execute();
$notifStmt->close();

echo json_encode(["success" => true, "id" => $id]);

$conn->close();
?>
