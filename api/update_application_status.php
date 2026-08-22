<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

if (empty($_SESSION['hiring_manager_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

$applicationId = (int) ($data->application_id ?? 0);
$status = trim($data->status ?? '');

$validStatuses = ['submitted', 'in-review', 'interview', 'offer', 'hired', 'rejected'];
$statusLabels = [
    'submitted' => 'Submitted',
    'in-review' => 'In Review',
    'interview' => 'Interview',
    'offer' => 'Offer',
    'hired' => 'Hired',
    'rejected' => 'Rejected',
];

if ($applicationId <= 0 || !in_array($status, $validStatuses, true)) {
    echo json_encode(["success" => false, "message" => "A valid application and status are required."]);
    $conn->close();
    exit();
}

$appStmt = $conn->prepare("SELECT candidate_id, job_title, shortlisted FROM applications WHERE id = ?");
$appStmt->bind_param("i", $applicationId);
$appStmt->execute();
$appResult = $appStmt->get_result();

if ($appResult->num_rows === 0) {
    $appStmt->close();
    echo json_encode(["success" => false, "message" => "Application not found."]);
    $conn->close();
    exit();
}

$app = $appResult->fetch_assoc();
$appStmt->close();

if (!$app['shortlisted']) {
    echo json_encode(["success" => false, "message" => "This candidate hasn't been shortlisted by HR yet."]);
    $conn->close();
    exit();
}

$stmt = $conn->prepare("UPDATE applications SET status = ? WHERE id = ?");
$stmt->bind_param("si", $status, $applicationId);
$stmt->execute();
$stmt->close();

$candidateId = (int) $app['candidate_id'];
if ($candidateId > 0) {
    $label = $statusLabels[$status];
    $message = "Your application for \"{$app['job_title']}\" has moved to: {$label}.";
    $notifType = in_array($status, ['hired', 'offer'], true) ? 'success' : (($status === 'rejected') ? 'warning' : 'info');
    $notifStmt = $conn->prepare("INSERT INTO notifications (candidate_id, message, type) VALUES (?, ?, ?)");
    $notifStmt->bind_param("iss", $candidateId, $message, $notifType);
    $notifStmt->execute();
    $notifStmt->close();
}

echo json_encode(["success" => true]);

$conn->close();
?>
