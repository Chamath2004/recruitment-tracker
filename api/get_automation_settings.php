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

$settings = ['autoEmail' => true, 'meetLinks' => true, 'reminders' => true];
$keyMap = ['auto_email' => 'autoEmail', 'meet_links' => 'meetLinks', 'reminders' => 'reminders'];

$result = $conn->query("SELECT setting_key, setting_value FROM app_settings");
while ($row = $result->fetch_assoc()) {
    if (isset($keyMap[$row['setting_key']])) {
        $settings[$keyMap[$row['setting_key']]] = $row['setting_value'] === '1';
    }
}

echo json_encode(["success" => true, "data" => $settings]);

$conn->close();
?>
