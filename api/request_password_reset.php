<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/email_helper.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email'] ?? '');

if (!$email) {
    echo json_encode(["success" => false, "message" => "Please enter your email address."]);
    exit();
}

$roleTables = ['candidates', 'hr_admins', 'interviewers', 'hiring_managers', 'senior_managers'];

$foundTable = null;
$foundName = '';

foreach ($roleTables as $table) {
    $stmt = $conn->prepare("SELECT first_name, last_name FROM `$table` WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $foundTable = $table;
        $foundName = trim($row['first_name'] . ' ' . $row['last_name']);
        $stmt->close();
        break;
    }
    $stmt->close();
}

if ($foundTable) {
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', time() + 30 * 60);

    $insertStmt = $conn->prepare("INSERT INTO password_resets (email, role_table, token, expires_at) VALUES (?, ?, ?, ?)");
    $insertStmt->bind_param("ssss", $email, $foundTable, $token, $expiresAt);
    $insertStmt->execute();
    $insertStmt->close();

    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');
    $scheme = $isHttps ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $apiDir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    $rootDir = rtrim(dirname($apiDir), '/\\');
    $resetLink = "$scheme://$host$rootDir/pages/Login.html?reset_token=" . urlencode($token);

    $safeName = htmlspecialchars($foundName ?: 'there', ENT_QUOTES, 'UTF-8');
    $body = "<p>Hi $safeName,</p>"
        . "<p>We received a request to reset your Altrium password. Click the link below to set a new one. This link expires in 30 minutes.</p>"
        . "<p><a href=\"$resetLink\">$resetLink</a></p>"
        . "<p>If you didn't request this, you can safely ignore this email — your password won't be changed.</p>";

    sendCandidateEmail($email, $foundName, "Reset your Altrium password", $body);
}

// Always the same response, whether or not the email was found —
// this avoids leaking which email addresses have an account.
echo json_encode(["success" => true, "message" => "If that email is registered, a password reset link has been sent."]);

$conn->close();
?>
