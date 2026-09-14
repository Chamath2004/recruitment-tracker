<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (empty($data->email) || empty($data->password)) {
    echo json_encode(["success" => false, "message" => "Please enter both email and password"]);
    exit();
}

$email = $data->email;
$password = $data->password;

$roleTables = [
    'candidate' => ['table' => 'candidates', 'session_key' => 'candidate_id', 'redirect' => 'Candidate.html'],
    'hr' => ['table' => 'hr_admins', 'session_key' => 'hr_admin_id', 'redirect' => 'HR.html'],
    'interviewer' => ['table' => 'interviewers', 'session_key' => 'interviewer_id', 'redirect' => 'Interviewer.html'],
    'hiring_manager' => ['table' => 'hiring_managers', 'session_key' => 'hiring_manager_id', 'redirect' => 'HiringManager.html'],
    'senior_manager' => ['table' => 'senior_managers', 'session_key' => 'senior_manager_id', 'redirect' => 'SeniorManager.html'],
];

foreach ($roleTables as $role => $config) {
    $stmt = $conn->prepare("SELECT id, password_hash FROM {$config['table']} WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        $stmt->close();

        if (password_verify($password, $row['password_hash'])) {
            $_SESSION[$config['session_key']] = $row['id'];
            echo json_encode(["success" => true, "role" => $role, "redirect" => $config['redirect']]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid email or password"]);
        }
        exit();
    }

    $stmt->close();
}

echo json_encode(["success" => false, "message" => "Invalid email or password"]);
$conn->close();
