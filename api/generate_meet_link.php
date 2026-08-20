<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
require_once __DIR__ . "/google_calendar.php";

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$adminId = (int) $_SESSION['hr_admin_id'];
$accessToken = googleGetValidAccessToken($conn, $adminId);

if (!$accessToken) {
    echo json_encode(["success" => false, "not_connected" => true, "message" => "Connect your Google Calendar to generate Meet links."]);
    $conn->close();
    exit();
}

$data = json_decode(file_get_contents("php://input"));

$date = $data->interview_date ?? '';
$time = $data->interview_time ?? '';
$duration = (int) ($data->duration_minutes ?? 30);
$interviewType = trim($data->interview_type ?? 'Interview');
$candidateName = trim($data->candidate_name ?? '');

if (!$date || !$time) {
    echo json_encode(["success" => false, "message" => "Please select a date and time first."]);
    $conn->close();
    exit();
}

$summary = $candidateName ? "$interviewType — $candidateName" : $interviewType;
$description = "Interview scheduled via TalentFlow recruitment tracker.";

$result = googleCreateMeetEvent($accessToken, $summary, $description, $date, $time, $duration);

echo json_encode($result);

$conn->close();
?>
