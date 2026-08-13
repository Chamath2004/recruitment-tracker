<?php
session_start();
$role = $_GET['role'] ?? '';
$redirect = $role === 'hr' ? 'HR_login.html' : ($role === 'interviewer' ? 'Interviewer_login.html' : 'Candidate_login.html');
$_SESSION = [];
session_destroy();
header("Location: $redirect");
exit();
?>
