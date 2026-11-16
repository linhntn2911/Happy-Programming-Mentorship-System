package com.happyprogramming.service;

import com.happyprogramming.dto.OperationalSettings;
import com.happyprogramming.dto.AdminDtos.Session;
import com.happyprogramming.repository.*;
import jakarta.validation.Validator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OperationalSettingsService {
    private static final Logger LOGGER = LoggerFactory.getLogger(OperationalSettingsService.class);
    private final OperationalSettingsRepository repository;
    private final AdminRepository audit;
    private final Validator validator;
    private final JdbcTemplate jdbc;

    public OperationalSettingsService(OperationalSettingsRepository repository, AdminRepository audit, Validator validator) {
        this(repository, audit, validator, null);
    }

    @Autowired
    public OperationalSettingsService(OperationalSettingsRepository repository, AdminRepository audit, Validator validator, @Autowired(required = false) JdbcTemplate jdbc) {
        this.repository = repository;
        this.audit = audit;
        this.validator = validator;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public OperationalSettings read() {
        var result = repository.read();
        if (result == null || !validator.validate(result).isEmpty())
            throw new IllegalStateException("Invalid operational configuration");
        return result;
    }

    @Transactional
    public void update(OperationalSettings.Change change, Session actor, String ip) {
        if (change == null || !validator.validate(change).isEmpty())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "Invalid operational settings.");
        repository.lock();
        var before = read();
        repository.write(change.settings(), actor.id());
        audit.audit(actor.id(), "OPERATIONS_SETTINGS_CHANGED", "SYSTEM_CONFIG", "platform.operations", before, change.settings(), change.reason().trim(), ip);

        String newAnnouncement = change.settings().announcement();
        String oldAnnouncement = before != null ? before.announcement() : null;
        if (jdbc != null && newAnnouncement != null && !newAnnouncement.isBlank() && !newAnnouncement.equals(oldAnnouncement)) {
            try {
                jdbc.update("""
                        INSERT INTO dbo.notifications (user_id, title, message, type, action_url, is_read, created_at)
                        SELECT u.id, 'System Announcement', ?, 'SYSTEM_ANNOUNCEMENT', '#/', 0, SYSUTCDATETIME()
                        FROM dbo.users u
                        WHERE u.status = 'ACTIVE'
                        """, newAnnouncement.trim());
            } catch (Exception ex) {
                LOGGER.warn("Failed to broadcast system announcement notification: {}", ex.getMessage());
            }
        }
    }
}
