<?php
session_start();
$role = $_GET['role'] ?? '';
$redirects = [
    'hr' => '../pages/HR_login.html',
    'interviewer' => '../pages/Interviewer_login.html',
    'hiring_manager' => '../pages/HiringManager_login.html',
];
$redirect = $redirects[$role] ?? '../pages/Candidate_login.html';
$_SESSION = [];
session_destroy();
header("Location: $redirect");
exit();
?>
