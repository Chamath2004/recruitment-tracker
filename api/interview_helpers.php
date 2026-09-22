<?php
// Flips any interview still marked 'scheduled' to 'completed' once its date/time has passed.
function autoCompletePastInterviews($conn)
{
    $conn->query("
        UPDATE interviews
        SET status = 'completed'
        WHERE status = 'scheduled'
          AND TIMESTAMP(interview_date, interview_time) < NOW()
    ");
}

/**
 * Sends the "24h before" and "1h before" interview reminder emails.
 *
 * There is no real cron/scheduled-task infrastructure on this host, so
 * this runs opportunistically every time an interview list is loaded
 * (same pattern as autoCompletePastInterviews above) instead of on a
 * fixed clock. In practice, as long as HR or the candidate loads a
 * page at some point inside each reminder window, the reminder fires
 * exactly once (tracked via reminder_24h_sent / reminder_1h_sent).
 */
function sendDueInterviewReminders($conn)
{
    require_once __DIR__ . '/app_settings_helper.php';
    require_once __DIR__ . '/email_helper.php';

    if (!getAppSetting($conn, 'reminders')) {
        return;
    }

    $windows = [
        ['column' => 'reminder_24h_sent', 'hours' => 24, 'label' => 'in about 24 hours'],
        ['column' => 'reminder_1h_sent', 'hours' => 1, 'label' => 'in about 1 hour'],
    ];

    foreach ($windows as $window) {
        $column = $window['column'];
        $hours = (int) $window['hours'];

        $stmt = $conn->prepare("
            SELECT i.id, i.interview_type, i.interview_date, i.interview_time, i.mode, i.meeting_link,
                   a.email, a.full_name, i.job_title
            FROM interviews i
            JOIN applications a ON a.id = i.application_id
            WHERE i.status = 'scheduled'
              AND i.$column = 0
              AND TIMESTAMP(i.interview_date, i.interview_time) BETWEEN NOW() AND (NOW() + INTERVAL $hours HOUR)
        ");
        $stmt->execute();
        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $when = date('M j, Y \a\t g:i A', strtotime($row['interview_date'] . ' ' . $row['interview_time']));
            $where = $row['mode'] === 'onsite'
                ? ($row['meeting_link'] ?: 'the office')
                : ($row['meeting_link'] ?: 'the video call link on your dashboard');

            $message = "Reminder: your {$row['interview_type']} interview for {$row['job_title']} is "
                . $window['label'] . ", on $when. Location/link: $where.";

            sendCandidateEmail($row['email'], $row['full_name'], "Interview Reminder - {$row['job_title']}", "<p>$message</p>");

            $update = $conn->prepare("UPDATE interviews SET $column = 1 WHERE id = ?");
            $update->bind_param("i", $row['id']);
            $update->execute();
            $update->close();
        }
        $stmt->close();
    }
}
?>
