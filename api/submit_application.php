<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['candidate_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/email_helper.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$candidateId = (int) $_SESSION['candidate_id'];

$jobTitle = $_POST['jobTitle'] ?? '';
$fullName = $_POST['fullName'] ?? '';
$email = $_POST['email'] ?? '';
$phone = $_POST['phone'] ?? '';
$linkedin = $_POST['linkedin'] ?? '';
$coverLetter = $_POST['coverLetter'] ?? '';
$resumeName = null;
$resumePath = null;

if (!$jobTitle || !$fullName || !$email) {
    echo json_encode(["success" => false, "message" => "Full name and email are required to submit an application."]);
    exit();
}

$dupStmt = $conn->prepare("SELECT id FROM applications WHERE candidate_id = ? AND job_title = ? AND status != 'rejected' LIMIT 1");
$dupStmt->bind_param("is", $candidateId, $jobTitle);
$dupStmt->execute();
$isDuplicate = $dupStmt->get_result()->num_rows > 0;
$dupStmt->close();

if ($isDuplicate) {
    echo json_encode(["success" => false, "message" => "You have already applied for this role."]);
    exit();
}

if (isset($_FILES['resume']) && $_FILES['resume']['error'] === UPLOAD_ERR_OK) {
    $allowedExt = ['pdf', 'doc', 'docx'];
    $maxSize = 5 * 1024 * 1024;
    $originalName = $_FILES['resume']['name'];
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

    if (!in_array($ext, $allowedExt)) {
        echo json_encode(["success" => false, "message" => "Resume must be a PDF, DOC, or DOCX file."]);
        exit();
    }

    if ($_FILES['resume']['size'] > $maxSize) {
        echo json_encode(["success" => false, "message" => "Resume file is too large (max 5MB)."]);
        exit();
    }

    $uploadDir = __DIR__ . '/../uploads/resumes/';
    $storedName = 'resume_' . $candidateId . '_' . uniqid() . '.' . $ext;

    if (!move_uploaded_file($_FILES['resume']['tmp_name'], $uploadDir . $storedName)) {
        echo json_encode(["success" => false, "message" => "Failed to save the uploaded resume."]);
        exit();
    }

    $resumeName = $originalName;
    $resumePath = $storedName;
}

if ($resumeName === null) {
    // No fresh file was attached to this application — reuse the candidate's
    // saved profile resume so they don't have to re-upload it every time.
    $stmt = $conn->prepare("SELECT resume_name, resume_path FROM candidates WHERE id = ?");
    $stmt->bind_param("i", $candidateId);
    $stmt->execute();
    $profileResume = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!empty($profileResume['resume_path'])) {
        $uploadDir = __DIR__ . '/../uploads/resumes/';
        $sourceFile = $uploadDir . basename($profileResume['resume_path']);
        $ext = strtolower(pathinfo($profileResume['resume_path'], PATHINFO_EXTENSION));
        $storedName = 'resume_' . $candidateId . '_' . uniqid() . '.' . $ext;

        if (file_exists($sourceFile) && copy($sourceFile, $uploadDir . $storedName)) {
            $resumeName = $profileResume['resume_name'];
            $resumePath = $storedName;
        }
    }
}

$stmt = $conn->prepare("INSERT INTO applications (candidate_id, job_title, full_name, email, phone, linkedin, resume_name, resume_path, cover_letter)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("issssssss", $candidateId, $jobTitle, $fullName, $email, $phone, $linkedin, $resumeName, $resumePath, $coverLetter);

if ($stmt->execute()) {
    $message = "Your application for \"$jobTitle\" has been submitted successfully.";
    $notifStmt = $conn->prepare("INSERT INTO notifications (candidate_id, message, type) VALUES (?, ?, 'success')");
    $notifStmt->bind_param("is", $candidateId, $message);
    $notifStmt->execute();
    $notifStmt->close();

    sendCandidateEmail($email, $fullName, "Application Received - $jobTitle", "<p>$message</p>");

    echo json_encode(["success" => true, "message" => "Application saved successfully!"]);
} else {
    echo json_encode(["success" => false, "message" => "SQL Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
