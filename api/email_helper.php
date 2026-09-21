<?php
require_once __DIR__ . '/../lib/PHPMailer/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/SMTP.php';
require_once __DIR__ . '/../lib/PHPMailer/PHPMailer.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Sends a notification email. Never throws — failures (e.g. SMTP blocked
 * on the host) are logged and swallowed so the calling action (applying,
 * scheduling, etc.) always succeeds regardless of email delivery.
 */
function sendCandidateEmail($toEmail, $toName, $subject, $bodyHtml) {
    $configPath = __DIR__ . '/email_config.php';
    if (!file_exists($configPath) || !$toEmail) {
        return false;
    }

    $config = require $configPath;

    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = $config['smtp_host'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtp_username'];
        $mail->Password = $config['smtp_password'];
        $mail->SMTPSecure = 'tls';
        $mail->Port = $config['smtp_port'];

        $mail->setFrom($config['from_email'], $config['from_name']);
        $mail->addAddress($toEmail, $toName ?: '');

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $bodyHtml;
        $mail->AltBody = strip_tags($bodyHtml);

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('Email send failed: ' . $mail->ErrorInfo);
        return false;
    }
}
