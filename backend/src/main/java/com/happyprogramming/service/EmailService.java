package com.happyprogramming.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.*;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EmailService {
    private final JavaMailSender sender;
    private final String from;
    private final String name;
    public EmailService(JavaMailSender sender, @Value("${spring.mail.username:}") String from,
                        @Value("${hpms.mail.from-name:HappyProgramming}") String name,
                        @Value("${hpms.mail.log-payout-otp:false}") boolean logPayoutOtp,
                        org.springframework.core.env.Environment environment) {
        this.sender=sender; this.from=from; this.name=name;
        // OTP values are never logged, including in development.
    }
    public void sendOtpEmail(String email, String recipient, String code, int minutes) { send(email,code,minutes,"verify your email"); }
    public void sendOtpEmail(String email, String recipient, String code) { send(email,code,10,"verify your email"); }
    public void sendMentorOtpEmail(String email, String recipient, String code, int minutes) { send(email,code,minutes,"submit your mentor application"); }
    public void sendMentorOtpEmail(String email, String recipient, String code) { send(email,code,15,"submit your mentor application"); }
    public void sendPasswordResetOtpEmail(String email, String recipient, String code, int minutes) { send(email,code,minutes,"reset your HappyProgramming password"); }
    public void sendPasswordResetOtpEmail(String email, String recipient, String code) { send(email,code,15,"reset your HappyProgramming password"); }

    public void sendPayoutOtpEmail(String email, String recipient, String code, String amountLabel, String destinationLabel) {
        sendPayoutOtpEmail(email,recipient,code,amountLabel,destinationLabel,10);
    }
    public void sendPayoutOtpEmail(String email, String recipient, String code, String amountLabel, String destinationLabel, int minutes) {

        if (from==null || from.isBlank()) throw unavailable();
        try {
            var message=sender.createMimeMessage();
            var helper=new MimeMessageHelper(message,false,"UTF-8");
            helper.setFrom(from,name); helper.setTo(email);
            helper.setSubject("HappyProgramming payout verification code");
            String who=(recipient!=null && !recipient.isBlank()) ? recipient : "Mentor";
            helper.setText("Dear "+who+",\n\n"
                +"You requested to withdraw "+amountLabel+" to "+destinationLabel+".\n"
                +"Your verification code is "+code+". It expires in "+minutes+" minutes.\n"
                +"If you did not request this payout, ignore this email and review your account security.\n\n"
                +"HappyProgramming Mentorship Team",false);
            sender.send(message);
        } catch (Exception e) {
            // Do not log the code, recipient, amount, SMTP credentials or provider response.
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

    private void sendNotification(String email, String subject, String body) {
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
        if (from==null || from.isBlank()) throw unavailable();
        try {
            var message=sender.createMimeMessage();
            var helper=new MimeMessageHelper(message,false,"UTF-8");
            helper.setFrom(from,name); helper.setTo(email);
            helper.setSubject("HappyProgramming verification code");
            helper.setText("Your verification code is "+code+". Use it to "+purpose
                +". It expires in "+minutes+" minutes. If you did not request this, ignore this email.",false);
            sender.send(message);
        } catch (Exception e) {
            // Do not log the code, recipient, SMTP credentials or provider response.
            throw unavailable();
        }
    }
    private ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Unable to send verification email. Please try again later.");
    }
}
