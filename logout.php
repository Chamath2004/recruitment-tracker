<?php
session_start();
$redirect = ($_GET['role'] ?? '') === 'hr' ? 'HR_login.html' : 'Candidate_login.html';
$_SESSION = [];
session_destroy();
header("Location: $redirect");
exit();
?>
