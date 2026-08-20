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

$options = [];
$result = $conn->query("SELECT id, first_name, last_name FROM interviewers ORDER BY first_name, last_name");
while ($row = $result->fetch_assoc()) {
    $options[] = [
        "id" => (int) $row['id'],
        "name" => trim($row['first_name'] . ' ' . $row['last_name'])
    ];
}

echo json_encode(["success" => true, "data" => $options]);

$conn->close();
?>
