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
$data = json_decode(file_get_contents("php://input"));

$fullName = trim($data->fullName ?? '');
if ($fullName === '') {
    echo json_encode(["success" => false, "message" => "Full name is required"]);
    exit();
}
$nameParts = preg_split('/\s+/', $fullName, 2);
$firstName = $nameParts[0];
$lastName = $nameParts[1] ?? '';

$phone = $data->phone ?? '';
$location = $data->location ?? '';
$linkedin = $data->linkedin ?? '';
$portfolio = $data->portfolio ?? '';
$headline = $data->headline ?? '';
$summary = $data->summary ?? '';
$skills = json_encode(is_array($data->skills ?? null) ? $data->skills : []);
$experience = json_encode(is_array($data->experience ?? null) ? $data->experience : []);
$education = json_encode(is_array($data->education ?? null) ? $data->education : []);

$stmt = $conn->prepare("UPDATE candidates SET
        first_name = ?, last_name = ?, phone = ?, location = ?, linkedin_url = ?,
        portfolio_url = ?, professional_headline = ?, summary = ?, skills = ?,
        experience = ?, education = ?
    WHERE id = ?");
$stmt->bind_param(
    "sssssssssssi",
    $firstName, $lastName, $phone, $location, $linkedin,
    $portfolio, $headline, $summary, $skills,
    $experience, $education, $candidateId
);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Profile updated successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "SQL Error: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>
