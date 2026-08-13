<?php
session_start();
require_once __DIR__ . "/google_calendar.php";

if (empty($_SESSION['hr_admin_id'])) {
    header("Location: HR_login.html");
    exit();
}

$state = bin2hex(random_bytes(16));
$_SESSION['google_oauth_state'] = $state;

$config = googleConfig();

$params = http_build_query([
    "client_id" => $config["client_id"],
    "redirect_uri" => googleRedirectUri(),
    "response_type" => "code",
    "scope" => "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email",
    "access_type" => "offline",
    "prompt" => "consent",
    "state" => $state,
]);

header("Location: https://accounts.google.com/o/oauth2/v2/auth?" . $params);
exit();
?>
