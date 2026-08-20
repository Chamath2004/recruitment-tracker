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

if (!empty($data->email) && !empty($data->password)) {
    $email = $data->email;
    $password = $data->password;

    $stmt = $conn->prepare("SELECT id, first_name, last_name, password_hash FROM interviewers WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        if (password_verify($password, $row['password_hash'])) {
            $_SESSION['interviewer_id'] = $row['id'];
            echo json_encode(["success" => true, "message" => "Login successful"]);
        } else {
            echo json_encode(["success" => false, "message" => "Invalid email or password"]);
        }
    } else {
        echo json_encode(["success" => false, "message" => "Invalid email or password"]);
    }

    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Please enter both email and password"]);
}

$conn->close();
?>
