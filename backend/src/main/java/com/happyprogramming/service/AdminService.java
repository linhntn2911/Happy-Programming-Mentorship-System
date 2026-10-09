package com.happyprogramming.service;

import com.happyprogramming.dto.AdminDtos;
import com.happyprogramming.repository.AdminRepository;

import com.happyprogramming.service.AdminService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
import java.util.Set;
import static com.happyprogramming.dto.AdminDtos.*;

@Service
public class AdminService {
    public static final Set<String> PERMISSIONS = Set.of("MENTOR_APPLICATION_MANAGE", "MENTEE_MANAGE", "MENTORSHIP_REQUEST_MANAGE", "SKILL_MANAGE");
    private final AdminRepository repository;
    public AdminService(AdminRepository repository) { this.repository = repository; }
    public Session requireAdmin(String email) {
        var user = repository.credential(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required."));
        if (!"ACTIVE".equals(user.status()) || !"ADMIN".equals(user.role()) || (user.lockedUntil() != null && user.lockedUntil().isAfter(java.time.Instant.now()))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Administrator access is required.");
        return new Session(user.id(), user.name(), user.email());
    }
    @Transactional(readOnly=true)
    public Workspace workspace() { return new Workspace(repository.accounts(), repository.audit(), repository.payments(), repository.settings()); }
    @Transactional
    public void status(long id, StatusChange change, Session actor, String ip) {
        var target = repository.lockAccount(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account no longer exists."));
        if (id == actor.id() || "ADMIN".equals(target.role())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Administrator accounts cannot be changed here.");
        if (target.status().equals(change.status())) return;
        repository.status(id, change.status());
        repository.audit(actor.id(), "ACCOUNT_STATUS_CHANGED", "USER", Long.toString(id), Map.of("status", target.status()), Map.of("status", change.status()), change.reason().trim(), ip);
    }
    @Transactional
    public void permissions(long id, PermissionChange change, Session actor, String ip) {
        if (!PERMISSIONS.containsAll(change.permissions())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown staff permission.");
        var target = repository.lockAccount(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account no longer exists."));
        if (!"STAFF".equals(target.role())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Permissions can only be assigned to staff.");
        var before = repository.permissions(id);
        repository.permissions(id, change.permissions(), actor.id());
        repository.audit(actor.id(), "STAFF_PERMISSIONS_CHANGED", "USER", Long.toString(id), Map.of("permissions", before), Map.of("permissions", change.permissions()), change.reason().trim(), ip);
    }
    @Transactional
    public void settings(SettingsChange change, Session actor, String ip) {
        repository.lockSettings();
        var before = repository.settings();
        repository.settings(change, actor.id());
        repository.audit(actor.id(), "SETTINGS_CHANGED", "SYSTEM_CONFIG", "platform", before, new Settings(change.commissionRate(), change.supportEmail()), change.reason().trim(), ip);
    }
}
