<?php
// Reads a single app_settings flag. Defaults to true (matches this app's
// historical always-on behavior) if the row is missing for any reason.
function getAppSetting($conn, $key, $default = true)
{
    $stmt = $conn->prepare("SELECT setting_value FROM app_settings WHERE setting_key = ?");
    $stmt->bind_param("s", $key);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows === 0) {
        $stmt->close();
        return $default;
    }
    $value = $result->fetch_assoc()['setting_value'];
    $stmt->close();
    return $value === '1';
}
?>
