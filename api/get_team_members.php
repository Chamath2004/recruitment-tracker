<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$result = $conn->query("SELECT id, first_name, last_name, email, department, role FROM hr_admins ORDER BY first_name, last_name");

$members = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int) $row['id'];
    $members[] = $row;
}

echo json_encode(["success" => true, "data" => $members]);

$conn->close();
?>
