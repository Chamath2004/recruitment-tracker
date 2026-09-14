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

// ---- Overall averages ----
$avgRating = 0;
$totalFeedback = 0;
$result = $conn->query("SELECT AVG(rating) AS avg_rating, COUNT(*) AS cnt FROM interview_feedback");
if ($result) {
    $row = $result->fetch_assoc();
    $avgRating = round((float) $row['avg_rating'], 1);
    $totalFeedback = (int) $row['cnt'];
}

$positiveCount = 0;
$result = $conn->query("SELECT COUNT(*) AS cnt FROM interview_feedback WHERE recommendation IN ('strong_yes', 'yes')");
if ($result) {
    $positiveCount = (int) $result->fetch_assoc()['cnt'];
}
$positiveRate = $totalFeedback > 0 ? round(($positiveCount / $totalFeedback) * 100) : 0;

// ---- Recommendation distribution ----
$recLabels = ['strong_yes' => 'Strong Yes', 'yes' => 'Yes', 'no' => 'No', 'strong_no' => 'Strong No'];
$recCounts = array_fill_keys(array_keys($recLabels), 0);
$result = $conn->query("SELECT recommendation, COUNT(*) AS cnt FROM interview_feedback GROUP BY recommendation");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        if (isset($recCounts[$row['recommendation']])) {
            $recCounts[$row['recommendation']] = (int) $row['cnt'];
        }
    }
}
$recommendationDistribution = [];
foreach ($recLabels as $key => $label) {
    $recommendationDistribution[] = ["recommendation" => $label, "count" => $recCounts[$key]];
}

// ---- Per-vacancy breakdown ----
$byVacancy = [];
$result = $conn->query("
    SELECT i.job_title,
        AVG(f.rating) AS avg_rating,
        COUNT(*) AS total,
        SUM(f.recommendation IN ('strong_yes', 'yes')) AS positive
    FROM interview_feedback f
    JOIN interviews i ON i.id = f.interview_id
    GROUP BY i.job_title
    ORDER BY avg_rating DESC
");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $total = (int) $row['total'];
        $positive = (int) $row['positive'];
        $byVacancy[] = [
            "jobTitle" => $row['job_title'],
            "avgRating" => round((float) $row['avg_rating'], 1),
            "totalFeedback" => $total,
            "positiveRate" => $total > 0 ? round(($positive / $total) * 100) : 0
        ];
    }
}

echo json_encode([
    "success" => true,
    "avgRating" => $avgRating,
    "totalFeedback" => $totalFeedback,
    "positiveRate" => $positiveRate,
    "recommendationDistribution" => $recommendationDistribution,
    "byVacancy" => $byVacancy
]);

$conn->close();
?>
