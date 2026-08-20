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
    $first_name = $conn->real_escape_string($data->first_name);
    $last_name = $conn->real_escape_string($data->last_name);
    $email = $conn->real_escape_string($data->email);
    $password_hash = password_hash($data->password, PASSWORD_DEFAULT);
    $phone = $conn->real_escape_string($data->phone);
    $location = $conn->real_escape_string($data->location);
    $linkedin = $conn->real_escape_string($data->linkedin);
    $headline = $conn->real_escape_string($data->headline);

    $sql = "INSERT INTO candidates (first_name, last_name, email, password_hash, phone, location, linkedin_url, professional_headline) 
            VALUES ('$first_name', '$last_name', '$email', '$password_hash', '$phone', '$location', '$linkedin', '$headline')";

    if ($conn->query($sql) === TRUE) {
        $_SESSION['candidate_id'] = $conn->insert_id;
        echo json_encode(["success" => true, "message" => "Account created successfully"]);
    } else {
        echo json_encode(["success" => false, "message" => "Email already exists or database error."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
}

$conn->close();
?>