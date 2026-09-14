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

// ---- Top-line totals ----
$totalApplications = 0;
$result = $conn->query("SELECT COUNT(*) AS cnt FROM applications");
if ($result) {
    $totalApplications = (int) $result->fetch_assoc()['cnt'];
}

$activeVacancies = 0;
$result = $conn->query("SELECT COUNT(*) AS cnt FROM vacancies WHERE status = 'active'");
if ($result) {
    $activeVacancies = (int) $result->fetch_assoc()['cnt'];
}

$totalHires = 0;
$result = $conn->query("SELECT COUNT(*) AS cnt FROM applications WHERE status = 'hired'");
if ($result) {
    $totalHires = (int) $result->fetch_assoc()['cnt'];
}

// ---- Monthly trend: applications received per month, and how many of
// those same applicants are hired right now, for the last 6 months ----
$monthBuckets = [];
for ($i = 5; $i >= 0; $i--) {
    $ts = strtotime("-$i months");
    $key = date('Y-m', $ts);
    $monthBuckets[$key] = ['month' => date('M', $ts), 'applications' => 0, 'hires' => 0];
}

$result = $conn->query("
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS ym, status, COUNT(*) AS cnt
    FROM applications
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY ym, status
");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        if (!isset($monthBuckets[$row['ym']])) continue;
        $monthBuckets[$row['ym']]['applications'] += (int) $row['cnt'];
        if ($row['status'] === 'hired') {
            $monthBuckets[$row['ym']]['hires'] += (int) $row['cnt'];
        }
    }
}
$monthlyApplications = array_values($monthBuckets);

// ---- Time to hire: average days from application to hire, per month the
// hire happened in. Only counts hires made after the hired_at column was
// added — older hires have no recorded hire date, so they're left out
// rather than guessed at. ----
$timeToHireBuckets = [];
for ($i = 5; $i >= 0; $i--) {
    $ts = strtotime("-$i months");
    $key = date('Y-m', $ts);
    $timeToHireBuckets[$key] = ['month' => date('M', $ts), 'days' => 0];
}

$result = $conn->query("
    SELECT DATE_FORMAT(hired_at, '%Y-%m') AS ym, AVG(DATEDIFF(hired_at, created_at)) AS avg_days
    FROM applications
    WHERE hired_at IS NOT NULL AND hired_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY ym
");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        if (!isset($timeToHireBuckets[$row['ym']])) continue;
        $timeToHireBuckets[$row['ym']]['days'] = round((float) $row['avg_days'], 1);
    }
}
$timeToHireData = array_values($timeToHireBuckets);

// ---- Pipeline funnel: how many non-rejected applications are currently
// at, or have already moved past, each stage ----
$stageOrder = ['submitted', 'in-review', 'interview', 'offer', 'hired'];
$stageLabels = ['submitted' => 'Applied', 'in-review' => 'Screening', 'interview' => 'Interview', 'offer' => 'Offer', 'hired' => 'Hired'];

$statusCounts = array_fill_keys($stageOrder, 0);
$result = $conn->query("SELECT status, COUNT(*) AS cnt FROM applications WHERE status != 'rejected' GROUP BY status");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        if (isset($statusCounts[$row['status']])) {
            $statusCounts[$row['status']] = (int) $row['cnt'];
        }
    }
}

// Cumulative from the end: stage N's count = applications at stage N or any later stage
$cumulative = [];
$running = 0;
for ($i = count($stageOrder) - 1; $i >= 0; $i--) {
    $running += $statusCounts[$stageOrder[$i]];
    $cumulative[$i] = $running;
}

$pipelineData = [];
$prevCount = null;
foreach ($stageOrder as $i => $status) {
    $count = $cumulative[$i];
    $dropOff = ($prevCount !== null && $prevCount > 0) ? round((($prevCount - $count) / $prevCount) * 100, 1) : 0;
    $pipelineData[] = ["stage" => $stageLabels[$status], "count" => $count, "dropOff" => max($dropOff, 0)];
    $prevCount = $count;
}

$rejectedCount = 0;
$result = $conn->query("SELECT COUNT(*) AS cnt FROM applications WHERE status = 'rejected'");
if ($result) {
    $rejectedCount = (int) $result->fetch_assoc()['cnt'];
}

echo json_encode([
    "success" => true,
    "totalApplications" => $totalApplications,
    "activeVacancies" => $activeVacancies,
    "totalHires" => $totalHires,
    "rejectedCount" => $rejectedCount,
    "monthlyApplications" => $monthlyApplications,
    "timeToHireData" => $timeToHireData,
    "pipelineData" => $pipelineData
]);

$conn->close();
?>
