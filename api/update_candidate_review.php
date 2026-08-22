<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

if (empty($_SESSION['hr_admin_id'])) {
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
$action = trim($data->action ?? '');

$validActions = ['shortlist', 'unshortlist', 'reject'];

if ($applicationId <= 0 || !in_array($action, $validActions, true)) {
    echo json_encode(["success" => false, "message" => "A valid application and action are required."]);
    $conn->close();
    exit();
}

$appStmt = $conn->prepare("SELECT candidate_id, job_title FROM applications WHERE id = ?");
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

if ($action === 'shortlist') {
    $stmt = $conn->prepare("UPDATE applications SET shortlisted = 1 WHERE id = ?");
    $stmt->bind_param("i", $applicationId);
    $stmt->execute();
    $stmt->close();
} elseif ($action === 'unshortlist') {
    $stmt = $conn->prepare("UPDATE applications SET shortlisted = 0 WHERE id = ?");
    $stmt->bind_param("i", $applicationId);
    $stmt->execute();
    $stmt->close();
} elseif ($action === 'reject') {
    $stmt = $conn->prepare("UPDATE applications SET status = 'rejected', shortlisted = 0 WHERE id = ?");
    $stmt->bind_param("i", $applicationId);
    $stmt->execute();
    $stmt->close();

    $candidateId = (int) $app['candidate_id'];
    if ($candidateId > 0) {
        $message = "Your application for \"{$app['job_title']}\" has moved to: Rejected.";
        $notifStmt = $conn->prepare("INSERT INTO notifications (candidate_id, message, type) VALUES (?, ?, 'warning')");
        $notifStmt->bind_param("is", $candidateId, $message);
        $notifStmt->execute();
        $notifStmt->close();
    }
}

echo json_encode(["success" => true]);

$conn->close();
?>
