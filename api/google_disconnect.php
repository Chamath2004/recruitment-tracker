<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
require_once __DIR__ . "/google_calendar.php";

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$adminId = (int) $_SESSION['hr_admin_id'];

$stmt = $conn->prepare("SELECT google_access_token FROM hr_admins WHERE id = ?");
$stmt->bind_param("i", $adminId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($row && !empty($row['google_access_token'])) {
    googleCurlRequest("https://oauth2.googleapis.com/revoke?token=" . urlencode($row['google_access_token']), "POST");
}

$clear = $conn->prepare("UPDATE hr_admins SET google_refresh_token = NULL, google_access_token = NULL, google_token_expires_at = NULL, google_account_email = NULL WHERE id = ?");
$clear->bind_param("i", $adminId);
$clear->execute();
$clear->close();
$conn->close();

echo json_encode(["success" => true]);
?>
