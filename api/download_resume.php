<?php
session_start();

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    http_response_code(500);
    exit("Database connection failed");
}

$applicationId = isset($_GET['application_id']) ? (int) $_GET['application_id'] : 0;

if (!$applicationId) {
    http_response_code(400);
    exit("Missing application_id");
}

$stmt = $conn->prepare("SELECT candidate_id, resume_name, resume_path FROM applications WHERE id = ?");
$stmt->bind_param("i", $applicationId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    exit("Application not found");
}

$app = $result->fetch_assoc();
$stmt->close();

$authorized = false;

if (!empty($_SESSION['hr_admin_id'])) {
    $authorized = true;
} elseif (!empty($_SESSION['candidate_id']) && (int) $_SESSION['candidate_id'] === (int) $app['candidate_id']) {
    $authorized = true;
} elseif (!empty($_SESSION['interviewer_id'])) {
    $interviewerId = (int) $_SESSION['interviewer_id'];
    $ivStmt = $conn->prepare("SELECT id FROM interviews WHERE application_id = ? AND interviewer_id = ? LIMIT 1");
    $ivStmt->bind_param("ii", $applicationId, $interviewerId);
    $ivStmt->execute();
    $ivResult = $ivStmt->get_result();
    $authorized = $ivResult->num_rows > 0;
    $ivStmt->close();
}

if (!$authorized) {
    http_response_code(403);
    exit("Not authorized to access this resume");
}

if (empty($app['resume_path'])) {
    http_response_code(404);
    exit("No resume on file for this application");
}

$filePath = __DIR__ . '/../uploads/resumes/' . basename($app['resume_path']);

if (!file_exists($filePath)) {
    http_response_code(404);
    exit("Resume file not found");
}

$conn->close();

$displayName = $app['resume_name'] ?: basename($app['resume_path']);
$ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
$mimeTypes = [
    'pdf' => 'application/pdf',
    'doc' => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
$mimeType = $mimeTypes[$ext] ?? 'application/octet-stream';
$disposition = (isset($_GET['mode']) && $_GET['mode'] === 'view' && $ext === 'pdf') ? 'inline' : 'attachment';

header("Content-Type: $mimeType");
header("Content-Disposition: $disposition; filename=\"" . str_replace('"', '', $displayName) . "\"");
header("Content-Length: " . filesize($filePath));
readfile($filePath);
exit;
?>
