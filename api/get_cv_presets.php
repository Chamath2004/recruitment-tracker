<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$result = $conn->query("SELECT id, name, must_skills, nice_skills, min_years FROM cv_screening_presets ORDER BY name ASC");
$presets = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int)$row['id'];
    $row['min_years'] = (int)$row['min_years'];
    $presets[] = $row;
}

echo json_encode(["success" => true, "data" => $presets]);

$conn->close();
?>
