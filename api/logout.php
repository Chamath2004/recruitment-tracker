<?php
session_start();
$role = $_GET['role'] ?? '';
$redirect = $role === 'hr' ? '../pages/HR_login.html' : ($role === 'interviewer' ? '../pages/Interviewer_login.html' : '../pages/Candidate_login.html');
$_SESSION = [];
session_destroy();
header("Location: $redirect");
exit();
?>
