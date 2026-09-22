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
$key = trim($data['key'] ?? '');
$value = !empty($data['value']);

$keyMap = ['autoEmail' => 'auto_email', 'meetLinks' => 'meet_links', 'reminders' => 'reminders'];

if (!isset($keyMap[$key])) {
    echo json_encode(["success" => false, "message" => "Unknown setting."]);
    $conn->close();
    exit();
}

$dbKey = $keyMap[$key];
$dbValue = $value ? '1' : '0';

$stmt = $conn->prepare("INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
$stmt->bind_param("sss", $dbKey, $dbValue, $dbValue);
$stmt->execute();
$stmt->close();

echo json_encode(["success" => true]);

$conn->close();
?>
