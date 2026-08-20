<?php
// Shared helpers for Google OAuth + Calendar API (Google Meet link generation).

function googleConfig()
{
    $config = require __DIR__ . "/google_config.php";
    return $config;
}

function googleRedirectUri()
{
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https');
    $scheme = $isHttps ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $path = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    return "$scheme://$host$path/google_oauth_callback.php";
}

function googleCurlRequest($url, $method = 'GET', $data = null, $headers = [])
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    if ($data !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($data) ? http_build_query($data) : $data);
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        return ["http_code" => 0, "body" => null, "error" => $error];
    }

    return ["http_code" => $httpCode, "body" => json_decode($response, true), "error" => null];
}

// Exchanges an authorization code for tokens.
function googleExchangeCode($code)
{
    $config = googleConfig();
    return googleCurlRequest("https://oauth2.googleapis.com/token", "POST", [
        "code" => $code,
        "client_id" => $config["client_id"],
        "client_secret" => $config["client_secret"],
        "redirect_uri" => googleRedirectUri(),
        "grant_type" => "authorization_code",
    ]);
}

// Returns a valid access token for the given HR admin, refreshing it if needed.
// Returns null if the admin hasn't connected a Google account.
function googleGetValidAccessToken($conn, $adminId)
{
    $stmt = $conn->prepare("SELECT google_refresh_token, google_access_token, google_token_expires_at FROM hr_admins WHERE id = ?");
    $stmt->bind_param("i", $adminId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || empty($row['google_refresh_token'])) {
        return null;
    }

    $expiresAt = $row['google_token_expires_at'] ? strtotime($row['google_token_expires_at']) : 0;
    if (!empty($row['google_access_token']) && $expiresAt > time() + 60) {
        return $row['google_access_token'];
    }

    $config = googleConfig();
    $result = googleCurlRequest("https://oauth2.googleapis.com/token", "POST", [
        "refresh_token" => $row['google_refresh_token'],
        "client_id" => $config["client_id"],
        "client_secret" => $config["client_secret"],
        "grant_type" => "refresh_token",
    ]);

    if ($result['http_code'] !== 200 || empty($result['body']['access_token'])) {
        return null;
    }

    $accessToken = $result['body']['access_token'];
    $expiresAtNew = date("Y-m-d H:i:s", time() + (int) ($result['body']['expires_in'] ?? 3600));

    $update = $conn->prepare("UPDATE hr_admins SET google_access_token = ?, google_token_expires_at = ? WHERE id = ?");
    $update->bind_param("ssi", $accessToken, $expiresAtNew, $adminId);
    $update->execute();
    $update->close();

    return $accessToken;
}

// Creates a Calendar event with a Google Meet link and returns the meet URL, or null on failure.
function googleCreateMeetEvent($accessToken, $summary, $description, $date, $time, $durationMinutes)
{
    $config = googleConfig();
    $timezone = $config["timezone"];

    $startDateTime = "{$date}T{$time}";
    $startTs = strtotime($startDateTime);
    if ($startTs === false) {
        return ["success" => false, "message" => "Invalid date or time."];
    }
    $endTs = $startTs + ((int) $durationMinutes * 60);

    $body = [
        "summary" => $summary,
        "description" => $description,
        "start" => ["dateTime" => date("Y-m-d\TH:i:s", $startTs), "timeZone" => $timezone],
        "end" => ["dateTime" => date("Y-m-d\TH:i:s", $endTs), "timeZone" => $timezone],
        "conferenceData" => [
            "createRequest" => [
                "requestId" => uniqid("meet_", true),
                "conferenceSolutionKey" => ["type" => "hangoutsMeet"],
            ],
        ],
    ];

    $result = googleCurlRequest(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
        "POST",
        json_encode($body),
        ["Authorization: Bearer $accessToken", "Content-Type: application/json"]
    );

    if ($result['http_code'] >= 200 && $result['http_code'] < 300 && !empty($result['body']['hangoutLink'])) {
        return ["success" => true, "meet_link" => $result['body']['hangoutLink'], "event_id" => $result['body']['id']];
    }

    $message = $result['body']['error']['message'] ?? ($result['error'] ?: "Failed to create the calendar event.");
    return ["success" => false, "message" => $message];
}
?>
