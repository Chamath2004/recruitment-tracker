<?php
/**
 * Runs every test_*.php file in this directory against the local site
 * (http://localhost/recruitment_tracker) and prints a combined summary.
 *
 * Requires XAMPP's Apache + MySQL running locally first.
 * Usage: php tests/api/run.php
 */
require_once __DIR__ . '/bootstrap.php';

$files = glob(__DIR__ . '/test_*.php');
sort($files);

foreach ($files as $file) {
    echo "\n#####################################\n";
    echo "# " . basename($file) . "\n";
    echo "#####################################\n";
    require $file;
}

exit(print_summary());
