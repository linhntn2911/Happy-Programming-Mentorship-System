package com.happyprogramming.scheduler;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "hpms.payments.expiry.enabled", havingValue = "true")
public class PendingPaymentExpiryJob {
    private final JdbcTemplate jdbc;

    public PendingPaymentExpiryJob(@Autowired(required = false) JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Scheduled(fixedDelayString = "${hpms.payments.expiry-scan-ms:60000}")
    public void expireOverdueAttempts() {
        if (jdbc == null) return;
        jdbc.update("""
                UPDATE dbo.payments
                SET status='EXPIRED', failure_code='CHECKOUT_TIMEOUT',
                    failure_message=N'Payment attempt expired before completion.', updated_at=SYSUTCDATETIME()
                WHERE status='PENDING' AND expires_at <= SYSUTCDATETIME()
                """);
    }

}
