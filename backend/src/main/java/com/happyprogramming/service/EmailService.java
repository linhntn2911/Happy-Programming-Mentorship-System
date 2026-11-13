package com.happyprogramming.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.*;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {
    private final JavaMailSender sender;
    private final String from;
    private final String name;
    private final String brevoApiKey;
    private final String fromEmail;
    private final ObjectMapper json = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    public EmailService(JavaMailSender sender,
                        @Value("${spring.mail.username:}") String from,
                        @Value("${hpms.mail.from-name:HappyProgramming}") String name,
                        @Value("${hpms.mail.from-email:}") String fromEmail,
                        @Value("${hpms.brevo.api-key:}") String brevoApiKey,
                        @Value("${hpms.mail.log-payout-otp:false}") boolean logPayoutOtp,
                        org.springframework.core.env.Environment environment) {
        this.sender = sender;
        this.from = from;
        this.name = name;
        this.fromEmail = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : from;
        this.brevoApiKey = brevoApiKey;
    }

    public void sendOtpEmail(String email, String recipient, String code, int minutes) { send(email, code, minutes, "verify your email"); }
    public void sendOtpEmail(String email, String recipient, String code) { send(email, code, 10, "verify your email"); }
    public void sendMentorOtpEmail(String email, String recipient, String code, int minutes) { send(email, code, minutes, "submit your mentor application"); }
    public void sendMentorOtpEmail(String email, String recipient, String code) { send(email, code, 15, "submit your mentor application"); }
    public void sendPasswordResetOtpEmail(String email, String recipient, String code, int minutes) { send(email, code, minutes, "reset your HappyProgramming password"); }
    public void sendPasswordResetOtpEmail(String email, String recipient, String code) { send(email, code, 15, "reset your HappyProgramming password"); }

    public void sendPayoutOtpEmail(String email, String recipient, String code, String amountLabel, String destinationLabel) {
        sendPayoutOtpEmail(email, recipient, code, amountLabel, destinationLabel, 10);
    }

    public void sendPayoutOtpEmail(String email, String recipient, String code, String amountLabel, String destinationLabel, int minutes) {
        String who = (recipient != null && !recipient.isBlank()) ? recipient : "Mentor";
        String subject = "HappyProgramming payout verification code";
        String body = "Dear " + who + ",\n\n"
            + "You requested to withdraw " + amountLabel + " to " + destinationLabel + ".\n"
            + "Your verification code is " + code + ". It expires in " + minutes + " minutes.\n"
            + "If you did not request this payout, ignore this email and review your account security.\n\n"
            + "HappyProgramming Mentorship Team";

        if (sendViaBrevo(email, subject, body)) {
            return;
        }

        if (from == null || from.isBlank()) throw unavailable();
        try {
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from, name);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(body, false);
            sender.send(message);
        } catch (Exception e) {
            throw unavailable();
        }
    }

    public void sendMentorApplicationApprovedEmail(String email, String recipient) {
        sendNotification(email, "Mentor Application Approved - Welcome to HappyProgramming!",
            "Dear " + (recipient != null && !recipient.isBlank() ? recipient : "Mentor") + ",\n\n"
            + "Congratulations! Your mentor application has been reviewed and approved by the HappyProgramming Staff team.\n\n"
            + "Your account now has full Mentor privileges. You can sign in to the platform and visit your Mentor Workspace to configure your profile, set up your availability, and accept mentorship requests.\n\n"
            + "Welcome to the team!\nHappyProgramming Mentorship Team");
    }

    public void sendMentorshipRequestAcceptedEmail(String email, String menteeName, String mentorName, String packageName) {
        String recipient = menteeName != null && !menteeName.isBlank() ? menteeName : "Mentee";
        String mentor = mentorName != null && !mentorName.isBlank() ? mentorName : "Your mentor";
        String pkg = packageName != null && !packageName.isBlank() ? packageName : "Mentorship Plan";

        sendNotification(email, "Mentorship Request Accepted - HappyProgramming",
            "Dear " + recipient + ",\n\n"
            + "Great news! Mentor " + mentor + " has accepted your mentorship request for package \"" + pkg + "\".\n\n"
            + "To complete your mentorship checkout, please sign in to your HappyProgramming account on our platform.\n"
            + "Sign in and open My applications to review the accepted request and continue to checkout.\n\n"
            + "Your payment is held safely in Escrow after payment is confirmed.\n\n"
            + "Best regards,\nHappyProgramming Mentorship Team");
    }

    public void sendMentorApplicationRejectedEmail(String email, String recipient, String reason) {
        sendNotification(email, "Update Regarding Your Mentor Application - HappyProgramming",
            "Dear " + (recipient != null && !recipient.isBlank() ? recipient : "Applicant") + ",\n\n"
            + "Thank you for your interest in becoming a mentor at HappyProgramming. Our operations team has reviewed your application and CV credentials.\n\n"
            + "At this time, your application requires updates before it can be approved.\n\n"
            + "Feedback / Note from Staff:\n"
            + (reason != null && !reason.isBlank() ? reason : "Please review the platform requirements and update your credentials.") + "\n\n"
            + "Please sign in to the platform to review your application feedback, update your credentials, and resubmit.\n\n"
            + "Best regards,\nHappyProgramming Mentorship Team");
    }

    public void sendNotification(String email, String subject, String body) {
        if (sendViaBrevo(email, subject, body)) {
            return;
        }
        if (from == null || from.isBlank()) return;
        try {
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from, name);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(body, false);
            sender.send(message);
        } catch (Exception e) {
            // Log/ignore in development so offline SMTP does not prevent database updates
        }
    }

    private void send(String email, String code, int minutes, String purpose) {
        String subject = "HappyProgramming verification code";
        String body = "Your verification code is " + code + ". Use it to " + purpose
            + ". It expires in " + minutes + " minutes. If you did not request this, ignore this email.";

        if (sendViaBrevo(email, subject, body)) {
            return;
        }

        if (from == null || from.isBlank()) throw unavailable();
        try {
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from, name);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(body, false);
            sender.send(message);
        } catch (Exception e) {
            throw unavailable();
        }
    }

    private boolean sendViaBrevo(String toEmail, String subject, String textContent) {
        if (brevoApiKey == null || brevoApiKey.isBlank()) return false;
        try {
            String senderEmail = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "nguyenthingoclinh291104@gmail.com";
            Map<String, Object> payload = Map.of(
                "sender", Map.of("name", name, "email", senderEmail),
                "to", List.of(Map.of("email", toEmail)),
                "subject", subject,
                "textContent", textContent
            );
            String body = json.writeValueAsString(payload);
            var req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .header("api-key", brevoApiKey.trim())
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(10))
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
            var res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            return res.statusCode() >= 200 && res.statusCode() < 300;
        } catch (Exception e) {
            return false;
        }
    }

    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Unable to send verification email. Please try again later.");
    }
}
