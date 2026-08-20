<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

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
$id = (int) ($data['id'] ?? 0);

$stmt = $conn->prepare("SELECT status FROM vacancies WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Vacancy not found"]);
    exit();
}

$current = $result->fetch_assoc()['status'];
$next = $current === 'active' ? 'closed' : 'active';

$update = $conn->prepare("UPDATE vacancies SET status = ? WHERE id = ?");
$update->bind_param("si", $next, $id);
$update->execute();

echo json_encode(["success" => true, "status" => $next]);

$stmt->close();
$update->close();
$conn->close();
?>
