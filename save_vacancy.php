<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "recruitment_tracker");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

$title = trim($data['title'] ?? '');
$department = trim($data['department'] ?? '');
$location = trim($data['location'] ?? '');
$type = trim($data['type'] ?? 'Full-time');
$salary = trim($data['salary'] ?? '');
$description = trim($data['description'] ?? '');
$requirements = trim($data['requirements'] ?? '');
$pipelineStages = trim($data['pipeline_stages'] ?? '');
$status = trim($data['status'] ?? 'active');
$id = (int) ($data['id'] ?? 0);

if ($title === '') {
    echo json_encode(["success" => false, "message" => "Job title is required"]);
    exit();
}

if (!in_array($status, ['active', 'closed', 'draft'], true)) {
    $status = 'active';
}

if ($id > 0) {
    $stmt = $conn->prepare("UPDATE vacancies SET title=?, department=?, location=?, type=?, salary=?, description=?, requirements=?, pipeline_stages=?, status=? WHERE id=?");
    $stmt->bind_param("sssssssssi", $title, $department, $location, $type, $salary, $description, $requirements, $pipelineStages, $status, $id);
} else {
    $stmt = $conn->prepare("INSERT INTO vacancies (title, department, location, type, salary, description, requirements, pipeline_stages, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("sssssssss", $title, $department, $location, $type, $salary, $description, $requirements, $pipelineStages, $status);
}

if ($stmt->execute()) {
    echo json_encode(["success" => true, "id" => $id > 0 ? $id : $stmt->insert_id]);
} else {
    echo json_encode(["success" => false, "message" => "SQL Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
