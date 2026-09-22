<?php
/**
 * Lightweight test framework for the recruitment_tracker API.
 * No Composer/PHPUnit dependency, consistent with the rest of the project.
 * Run all tests with: php tests/api/run.php
 */

define('BASE_URL', 'http://localhost/recruitment_tracker');
define('QA_EMAIL_DOMAIN', 'qa.altrium.test');

function qa_email($label) {
    return strtolower($label) . '_' . substr(md5((string) microtime(true) . random_int(0, 999999)), 0, 8) . '@' . QA_EMAIL_DOMAIN;
}

function test_db() {
    static $conn = null;
    if ($conn === null) {
        $conn = new mysqli("localhost", "root", "", "recruitment_tracker");
        if ($conn->connect_error) {
            fwrite(STDERR, "Could not connect to test database: {$conn->connect_error}\n");
            exit(1);
        }
    }
    return $conn;
}

function new_cookie_jar() {
    return sys_get_temp_dir() . '/altrium_test_' . bin2hex(random_bytes(6)) . '.txt';
}

function http_post_json($path, $data, $cookieJar = null) {
    $ch = curl_init(BASE_URL . $path);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if ($cookieJar) {
        curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieJar);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieJar);
    }
    $response = curl_exec($ch);
    if ($response === false) {
        throw new Exception('HTTP POST failed: ' . curl_error($ch));
    }
    curl_close($ch);
    $decoded = json_decode($response, true);
    if ($decoded === null) {
        throw new Exception("Non-JSON response from $path: $response");
    }
    return $decoded;
}

function http_post_multipart($path, $fields, $cookieJar = null) {
    $ch = curl_init(BASE_URL . $path);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $fields);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if ($cookieJar) {
        curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieJar);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieJar);
    }
    $response = curl_exec($ch);
    if ($response === false) {
        throw new Exception('HTTP POST failed: ' . curl_error($ch));
    }
    curl_close($ch);
    $decoded = json_decode($response, true);
    if ($decoded === null) {
        throw new Exception("Non-JSON response from $path: $response");
    }
    return $decoded;
}

function http_get($path, $cookieJar = null) {
    $ch = curl_init(BASE_URL . $path);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    if ($cookieJar) {
        curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieJar);
        curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieJar);
    }
    $response = curl_exec($ch);
    if ($response === false) {
        throw new Exception('HTTP GET failed: ' . curl_error($ch));
    }
    curl_close($ch);
    $decoded = json_decode($response, true);
    if ($decoded === null) {
        throw new Exception("Non-JSON response from $path: $response");
    }
    return $decoded;
}

// ---- assertion / reporting ----

$GLOBALS['__pass'] = 0;
$GLOBALS['__fail'] = 0;
$GLOBALS['__failures'] = [];
$GLOBALS['__suite'] = '';

function test_case($name, callable $fn) {
    echo "\n--- $name ---\n";
    try {
        $fn();
    } catch (Throwable $e) {
        $GLOBALS['__fail']++;
        $line = "[FAIL] $name -> uncaught " . get_class($e) . ": " . $e->getMessage();
        $GLOBALS['__failures'][] = $line;
        echo "  $line\n";
    }
}

function assert_true($cond, $message) {
    if ($cond) {
        $GLOBALS['__pass']++;
        echo "  [PASS] $message\n";
    } else {
        $GLOBALS['__fail']++;
        $line = "[FAIL] $message";
        $GLOBALS['__failures'][] = $line;
        echo "  $line\n";
    }
}

function assert_eq($expected, $actual, $message) {
    assert_true(
        $expected === $actual,
        "$message (expected " . var_export($expected, true) . ", got " . var_export($actual, true) . ")"
    );
}

function print_summary() {
    $pass = $GLOBALS['__pass'];
    $fail = $GLOBALS['__fail'];
    echo "\n=====================================\n";
    echo "TOTAL: " . ($pass + $fail) . "   PASS: $pass   FAIL: $fail\n";
    if ($fail > 0) {
        echo "\nFailed assertions:\n";
        foreach ($GLOBALS['__failures'] as $f) {
            echo " - $f\n";
        }
    }
    echo "=====================================\n";
    return $fail > 0 ? 1 : 0;
}
