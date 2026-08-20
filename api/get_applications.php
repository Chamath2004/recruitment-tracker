<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

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

$stmt = $conn->prepare("SELECT * FROM applications WHERE candidate_id = ? ORDER BY created_at DESC");
$stmt->bind_param("i", $candidateId);
$stmt->execute();
$result = $stmt->get_result();

$applications = [];

if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $applications[] = $row;
    }
}
$stmt->close();

$interviewsByApplication = [];
$interviewStmt = $conn->prepare("SELECT application_id, interview_type, interview_date, interview_time, duration_minutes, interviewer, mode, meeting_link, status FROM interviews WHERE candidate_id = ? AND status != 'cancelled' ORDER BY interview_date ASC, interview_time ASC");
$interviewStmt->bind_param("i", $candidateId);
$interviewStmt->execute();
$interviewResult = $interviewStmt->get_result();
while ($row = $interviewResult->fetch_assoc()) {
    $interviewsByApplication[(int) $row['application_id']] = $row;
}
$interviewStmt->close();

foreach ($applications as &$app) {
    $appId = (int) $app['id'];
    $app['interview'] = $interviewsByApplication[$appId] ?? null;
}
unset($app);

echo json_encode(["success" => true, "data" => $applications]);

$conn->close();
?>
