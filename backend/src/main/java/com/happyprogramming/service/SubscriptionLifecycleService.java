package com.happyprogramming.service;

import com.happyprogramming.repository.SubscriptionLifecycleRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubscriptionLifecycleService {
    private final SubscriptionLifecycleRepository repository;
    private final JdbcTemplate jdbc;
    private final EmailService emailService;

    public SubscriptionLifecycleService(SubscriptionLifecycleRepository repository) {
        this(repository, null, null);
    }

    @Autowired
    public SubscriptionLifecycleService(
            SubscriptionLifecycleRepository repository,
            @Autowired(required = false) JdbcTemplate jdbc,
            @Autowired(required = false) EmailService emailService) {
        this.repository = repository;
        this.jdbc = jdbc;
        this.emailService = emailService;
    }

    @Transactional
    public LifecycleResult advanceLifecycle() {
        int ended = repository.endExpiredSubscriptions();
        int activated = repository.activateCompletedTrials();
        int remindersSent = sendDay5DisputeAssuranceReminders();
        return new LifecycleResult(ended, activated, remindersSent);
    }

    public int sendDay5DisputeAssuranceReminders() {
        List<SubscriptionLifecycleRepository.Day5ReminderTarget> targets = repository.findEligibleDay5Reminders();
        int sent = 0;
        for (var target : targets) {
            try {
                String title = "[Bảo đảm quyền lợi học tập] Khóa mentorship " + target.packageName() + " sắp hết 7 ngày bảo đảm";
                String msg = String.format(
                        "Gói mentorship \"%s\" cùng Mentor %s của bạn đã bước sang ngày thứ 5. " +
                        "Trong 7 ngày đầu kể từ khi bắt đầu khóa học, toàn bộ học phí vẫn được hệ thống bảo đảm an toàn. " +
                        "Nếu bạn gặp bất kỳ vấn đề gì về chất lượng hoặc Mentor vắng mặt, không phản hồi đúng cam kết, " +
                        "hãy gửi Khiếu nại/Báo cáo trước thời hạn 7 ngày để được giải quyết nhanh nhất và dễ xử lý nhất.",
                        target.packageName(), target.mentorName());
                String actionUrl = "#/applications?requestId=" + target.requestId();

                if (jdbc != null) {
                    jdbc.update("""
                            INSERT INTO dbo.notifications (user_id, title, message, type, action_url, is_read, created_at)
                            VALUES (?, ?, ?, 'DAY5_ASSURANCE_REMINDER', ?, 0, SYSUTCDATETIME())
                            """, target.menteeId(), title, msg, actionUrl);
                }

                if (emailService != null && target.menteeEmail() != null && !target.menteeEmail().isBlank()) {
                    String subject = "[HappyProgramming] Nhắc nhở bảo đảm quyền lợi - 7 ngày an toàn gói Mentorship";
                    String emailBody = String.format(
                            "Xin chào %s,\n\n" +
                            "Khóa mentorship \"%s\" của bạn cùng Mentor %s đã bước sang ngày thứ 5.\n\n" +
                            "HappyProgramming muốn nhắc nhở bạn về chính sách Bảo vệ quyền lợi học viên trong 7 ngày đầu:\n" +
                            "• Trong vòng 7 ngày kể từ khi bắt đầu khóa học, học phí vẫn được tạm giữ an toàn trên hệ thống.\n" +
                            "• Nếu bạn gặp bất kỳ vấn đề gì (Mentor không phản hồi, không hướng dẫn đúng cam kết, bỏ buổi), " +
                            "việc gửi Khiếu nại (Report/Dispute) trong 7 ngày đầu sẽ được Đội ngũ Vận hành hỗ trợ xử lý và hoàn tiền nhanh nhất và thuận lợi nhất.\n\n" +
                            "Nếu bạn cần gửi khiếu nại hoặc xem thông tin khóa học, vui lòng truy cập:\n" +
                            "#/applications?requestId=%d\n\n" +
                            "Chúc bạn có trải nghiệm học tập hiệu quả cùng HappyProgramming!\n\n" +
                            "Trân trọng,\nHappyProgramming Support Team",
                            target.menteeName() != null ? target.menteeName() : "Mentee",
                            target.packageName(),
                            target.mentorName() != null ? target.mentorName() : "Mentor",
                            target.requestId());
                    emailService.sendNotification(target.menteeEmail(), subject, emailBody);
                }
                sent++;
            } catch (Exception ex) {
                // Ignore and proceed to next target
            }
        }
        return sent;
    }

    public record LifecycleResult(int ended, int activated, int remindersSent) {
        public LifecycleResult(int ended, int activated) {
            this(ended, activated, 0);
        }
    }
}
