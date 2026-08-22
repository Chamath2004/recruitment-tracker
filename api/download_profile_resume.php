<?php
session_start();

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    http_response_code(500);
    exit("Database connection failed");
}

if (empty($_SESSION['candidate_id'])) {
    http_response_code(403);
    exit("Not authorized");
}

$candidateId = (int) $_SESSION['candidate_id'];

$stmt = $conn->prepare("SELECT resume_name, resume_path FROM candidates WHERE id = ?");
$stmt->bind_param("i", $candidateId);
$stmt->execute();
$candidate = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (empty($candidate['resume_path'])) {
    http_response_code(404);
    exit("No resume on file");
}

$filePath = __DIR__ . '/../uploads/resumes/' . basename($candidate['resume_path']);

if (!file_exists($filePath)) {
    http_response_code(404);
    exit("Resume file not found");
}

$conn->close();

$displayName = $candidate['resume_name'] ?: basename($candidate['resume_path']);
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
