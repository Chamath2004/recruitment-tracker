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

$stmt = $conn->prepare("INSERT INTO applications (candidate_id, job_title, full_name, email, phone, linkedin, resume_name, resume_path, cover_letter)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmt->bind_param("issssssss", $candidateId, $jobTitle, $fullName, $email, $phone, $linkedin, $resumeName, $resumePath, $coverLetter);

if ($stmt->execute()) {
    $message = "Your application for \"$jobTitle\" has been submitted successfully.";
    $notifStmt = $conn->prepare("INSERT INTO notifications (candidate_id, message, type) VALUES (?, ?, 'success')");
    $notifStmt->bind_param("is", $candidateId, $message);
    $notifStmt->execute();
    $notifStmt->close();

    echo json_encode(["success" => true, "message" => "Application saved successfully!"]);
} else {
    echo json_encode(["success" => false, "message" => "SQL Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
