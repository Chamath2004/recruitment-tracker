<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

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

if (!isset($_FILES['resume']) || $_FILES['resume']['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(["success" => false, "message" => "No resume file was received."]);
    $conn->close();
    exit();
}

$allowedExt = ['pdf', 'doc', 'docx'];
$maxSize = 5 * 1024 * 1024;
$originalName = $_FILES['resume']['name'];
$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if (!in_array($ext, $allowedExt)) {
    echo json_encode(["success" => false, "message" => "Resume must be a PDF, DOC, or DOCX file."]);
    $conn->close();
    exit();
}

if ($_FILES['resume']['size'] > $maxSize) {
    echo json_encode(["success" => false, "message" => "Resume file is too large (max 5MB)."]);
    $conn->close();
    exit();
}

$uploadDir = __DIR__ . '/../uploads/resumes/';
$storedName = 'resume_' . $candidateId . '_' . uniqid() . '.' . $ext;

if (!move_uploaded_file($_FILES['resume']['tmp_name'], $uploadDir . $storedName)) {
    echo json_encode(["success" => false, "message" => "Failed to save the uploaded resume."]);
    $conn->close();
    exit();
}

$stmt = $conn->prepare("SELECT resume_path FROM candidates WHERE id = ?");
$stmt->bind_param("i", $candidateId);
$stmt->execute();
$existing = $stmt->get_result()->fetch_assoc();
$stmt->close();

$stmt = $conn->prepare("UPDATE candidates SET resume_name = ?, resume_path = ? WHERE id = ?");
$stmt->bind_param("ssi", $originalName, $storedName, $candidateId);
$stmt->execute();
$stmt->close();

if (!empty($existing['resume_path'])) {
    $oldFile = $uploadDir . basename($existing['resume_path']);
    if (file_exists($oldFile)) {
        unlink($oldFile);
    }
}

echo json_encode(["success" => true, "resume_name" => $originalName]);

$conn->close();
?>
