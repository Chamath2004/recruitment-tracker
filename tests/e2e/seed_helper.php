<?php
/**
 * Test-only CLI helper for the Playwright (Node) E2E suite.
 * Lets Node seed/clean up disposable QA data through real PHP + mysqli
 * (matching how the app itself writes to the DB) without needing a
 * separate Node MySQL driver.
 *
 * Usage: php seed_helper.php <sql>
 * Prints {"insert_id":..,"affected_rows":..} on success.
 */
$sql = $argv[1] ?? '';
if (!$sql) {
    fwrite(STDERR, "Usage: php seed_helper.php <sql>\n");
    exit(1);
}

$conn = new mysqli("localhost", "root", "", "recruitment_tracker");
if ($conn->connect_error) {
    fwrite(STDERR, $conn->connect_error);
    exit(1);
}

$result = $conn->query($sql);
if ($result === false) {
    fwrite(STDERR, $conn->error);
    exit(1);
}

echo json_encode(["insert_id" => $conn->insert_id, "affected_rows" => $conn->affected_rows]);
$conn->close();
