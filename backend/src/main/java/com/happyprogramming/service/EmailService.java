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
                        @Value("${hpms.mail.from-name:HappyProgramming}") String name) {
        this.sender=sender; this.from=from; this.name=name;
    }
    public void sendOtpEmail(String email, String recipient, String code) { send(email,code,10,"verify your email"); }
    public void sendMentorOtpEmail(String email, String recipient, String code) { send(email,code,15,"submit your mentor application"); }
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
