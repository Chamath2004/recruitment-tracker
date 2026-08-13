<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

if (empty($_SESSION['hr_admin_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "recruitment_tracker");

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$currentAdminId = (int) $_SESSION['hr_admin_id'];

$roleStmt = $conn->prepare("SELECT role FROM hr_admins WHERE id = ?");
$roleStmt->bind_param("i", $currentAdminId);
$roleStmt->execute();
$currentAdmin = $roleStmt->get_result()->fetch_assoc();
$roleStmt->close();

if (!$currentAdmin || $currentAdmin['role'] !== 'admin') {
    echo json_encode(["success" => false, "message" => "You don't have permission to do this."]);
    $conn->close();
    exit();
}

$data = json_decode(file_get_contents("php://input"));

$id = isset($data->id) ? (int) $data->id : 0;
$firstName = trim($data->first_name ?? '');
$lastName = trim($data->last_name ?? '');
$email = trim($data->email ?? '');
$department = trim($data->department ?? '');
$role = ($data->role ?? '') === 'admin' ? 'admin' : 'recruiter';
$password = $data->password ?? '';

if ($firstName === '' || $lastName === '' || $email === '') {
    echo json_encode(["success" => false, "message" => "First name, last name, and email are required."]);
    $conn->close();
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["success" => false, "message" => "Please enter a valid email address."]);
    $conn->close();
    exit();
}

$emailCheckStmt = $conn->prepare("SELECT id FROM hr_admins WHERE email = ? AND id != ?");
$emailCheckStmt->bind_param("si", $email, $id);
$emailCheckStmt->execute();
if ($emailCheckStmt->get_result()->num_rows > 0) {
    echo json_encode(["success" => false, "message" => "An HR account with that email already exists."]);
    $emailCheckStmt->close();
    $conn->close();
    exit();
}
$emailCheckStmt->close();

if ($id === 0) {
    if (strlen($password) < 8) {
        echo json_encode(["success" => false, "message" => "Password must be at least 8 characters."]);
        $conn->close();
        exit();
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("INSERT INTO hr_admins (first_name, last_name, email, password_hash, department, role) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssssss", $firstName, $lastName, $email, $passwordHash, $department, $role);
    $stmt->execute();
    $stmt->close();
} else {
    if ($id === $currentAdminId && $role !== 'admin') {
        $adminCountResult = $conn->query("SELECT COUNT(*) AS cnt FROM hr_admins WHERE role = 'admin'");
        $adminCount = (int) $adminCountResult->fetch_assoc()['cnt'];
        if ($adminCount <= 1) {
            echo json_encode(["success" => false, "message" => "You can't remove your own admin role — you're the only admin."]);
            $conn->close();
            exit();
        }
    }

    if ($password !== '') {
        if (strlen($password) < 8) {
            echo json_encode(["success" => false, "message" => "Password must be at least 8 characters."]);
            $conn->close();
            exit();
        }
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE hr_admins SET first_name = ?, last_name = ?, email = ?, department = ?, role = ?, password_hash = ? WHERE id = ?");
        $stmt->bind_param("ssssssi", $firstName, $lastName, $email, $department, $role, $passwordHash, $id);
    } else {
        $stmt = $conn->prepare("UPDATE hr_admins SET first_name = ?, last_name = ?, email = ?, department = ?, role = ? WHERE id = ?");
        $stmt->bind_param("sssssi", $firstName, $lastName, $email, $department, $role, $id);
    }
    $stmt->execute();
    $stmt->close();
}

echo json_encode(["success" => true]);

$conn->close();
?>
