<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['candidate_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "recruitment_tracker";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$candidateId = (int) $_SESSION['candidate_id'];
$data = json_decode(file_get_contents("php://input"), true);

if ($data) {
    $jobTitle = $data['jobTitle'] ?? '';
    $fullName = $data['fullName'] ?? '';
    $email = $data['email'] ?? '';
    $phone = $data['phone'] ?? '';
    $linkedin = $data['linkedin'] ?? '';
    $resumeName = $data['resumeName'] ?? '';
    $coverLetter = $data['coverLetter'] ?? '';

    $stmt = $conn->prepare("INSERT INTO applications (candidate_id, job_title, full_name, email, phone, linkedin, resume_name, cover_letter)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("isssssss", $candidateId, $jobTitle, $fullName, $email, $phone, $linkedin, $resumeName, $coverLetter);

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
} else {
    echo json_encode(["success" => false, "message" => "Invalid data received."]);
}

$conn->close();
?>
