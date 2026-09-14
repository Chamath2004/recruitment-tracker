<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

if (empty($_SESSION['senior_manager_id'])) {
    echo json_encode(["success" => false, "message" => "Not logged in"]);
    exit();
}

require_once __DIR__ . '/db.php';

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit();
}

$departments = [];

$result = $conn->query("
    SELECT department,
        COUNT(*) AS total_vacancies,
        SUM(status = 'active') AS active_vacancies
    FROM vacancies
    WHERE department IS NOT NULL AND department != ''
    GROUP BY department
");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $departments[$row['department']] = [
            "department" => $row['department'],
            "totalVacancies" => (int) $row['total_vacancies'],
            "activeVacancies" => (int) $row['active_vacancies'],
            "totalApplicants" => 0,
            "shortlisted" => 0,
            "hired" => 0
        ];
    }
}

$result = $conn->query("
    SELECT v.department,
        COUNT(a.id) AS total_applicants,
        SUM(a.shortlisted = 1) AS shortlisted,
        SUM(a.status = 'hired') AS hired
    FROM applications a
    JOIN vacancies v ON v.title = a.job_title
    WHERE v.department IS NOT NULL AND v.department != ''
    GROUP BY v.department
");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        if (!isset($departments[$row['department']])) continue;
        $departments[$row['department']]['totalApplicants'] = (int) $row['total_applicants'];
        $departments[$row['department']]['shortlisted'] = (int) $row['shortlisted'];
        $departments[$row['department']]['hired'] = (int) $row['hired'];
    }
}

echo json_encode(["success" => true, "data" => array_values($departments)]);

$conn->close();
?>
