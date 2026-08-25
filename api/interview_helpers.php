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
?>
