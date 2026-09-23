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

$data = json_decode(file_get_contents("php://input"), true);
$name = trim($data['name'] ?? '');
$must = trim($data['must_skills'] ?? '');
$nice = trim($data['nice_skills'] ?? '');
$years = max(0, min(50, (int)($data['min_years'] ?? 0)));

if ($name === '') {
    echo json_encode(["success" => false, "message" => "Give this set of criteria a name."]);
    exit();
}
if (mb_strlen($name) > 100) {
    echo json_encode(["success" => false, "message" => "Name is too long (max 100 characters)."]);
    exit();
}
if ($must === '' && $nice === '') {
    echo json_encode(["success" => false, "message" => "Add at least one must-have or nice-to-have skill before saving."]);
    exit();
}

// Saving under an existing name updates that preset instead of duplicating it.
$stmt = $conn->prepare(
    "INSERT INTO cv_screening_presets (name, must_skills, nice_skills, min_years) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE must_skills = VALUES(must_skills), nice_skills = VALUES(nice_skills), min_years = VALUES(min_years)"
);
$stmt->bind_param("sssi", $name, $must, $nice, $years);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare("SELECT id FROM cv_screening_presets WHERE name = ?");
$stmt->bind_param("s", $name);
$stmt->execute();
$id = (int)$stmt->get_result()->fetch_assoc()['id'];
$stmt->close();

echo json_encode(["success" => true, "id" => $id]);

$conn->close();
?>
