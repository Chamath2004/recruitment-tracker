<?php
session_start();
require_once __DIR__ . "/google_calendar.php";

if (empty($_SESSION['hr_admin_id'])) {
    header("Location: HR_login.html");
    exit();
}

if (empty($_GET['code']) || empty($_GET['state']) || $_GET['state'] !== ($_SESSION['google_oauth_state'] ?? null)) {
    header("Location: HR.html?google=error#interviews");
    exit();
}
unset($_SESSION['google_oauth_state']);

$adminId = (int) $_SESSION['hr_admin_id'];
$tokenResult = googleExchangeCode($_GET['code']);

if ($tokenResult['http_code'] !== 200 || empty($tokenResult['body']['access_token'])) {
    header("Location: HR.html?google=error#interviews");
    exit();
}

$accessToken = $tokenResult['body']['access_token'];
$refreshToken = $tokenResult['body']['refresh_token'] ?? null;
$expiresAt = date("Y-m-d H:i:s", time() + (int) ($tokenResult['body']['expires_in'] ?? 3600));

$userInfo = googleCurlRequest("https://www.googleapis.com/oauth2/v2/userinfo", "GET", null, ["Authorization: Bearer $accessToken"]);
$email = $userInfo['body']['email'] ?? null;

$conn = new mysqli("localhost", "root", "", "recruitment_tracker");
if ($conn->connect_error) {
    header("Location: HR.html?google=error#interviews");
    exit();
}

if ($refreshToken) {
    $stmt = $conn->prepare("UPDATE hr_admins SET google_refresh_token = ?, google_access_token = ?, google_token_expires_at = ?, google_account_email = ? WHERE id = ?");
    $stmt->bind_param("ssssi", $refreshToken, $accessToken, $expiresAt, $email, $adminId);
} else {
    // Google only returns a refresh_token on first consent; keep the existing one on re-auth.
    $stmt = $conn->prepare("UPDATE hr_admins SET google_access_token = ?, google_token_expires_at = ?, google_account_email = ? WHERE id = ?");
    $stmt->bind_param("sssi", $accessToken, $expiresAt, $email, $adminId);
}
$stmt->execute();
$stmt->close();
$conn->close();

header("Location: HR.html?google=connected#interviews");
exit();
?>
