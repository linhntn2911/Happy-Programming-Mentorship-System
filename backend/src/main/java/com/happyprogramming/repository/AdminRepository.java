package com.happyprogramming.repository;

import com.happyprogramming.dto.AdminDtos;
import com.happyprogramming.repository.AdminRepository;
import com.happyprogramming.service.AdminService;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import static com.happyprogramming.dto.AdminDtos.*;

@Repository
public class AdminRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public AdminRepository(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }
    public record Credential(long id, String name, String email, String hash, String role, String status, int failures, Instant lockedUntil) { }
    public Optional<Credential> credential(String email) {
        return jdbc.query("SELECT id, full_name, email, password_hash, CASE WHEN role_code='ADMIN' OR EXISTS (SELECT 1 FROM dbo.user_roles r WHERE r.user_id=users.id AND r.role_code='ADMIN') THEN 'ADMIN' ELSE role_code END role_code, status, failed_login_count, locked_until FROM dbo.users WHERE email_normalized = LOWER(LTRIM(RTRIM(?)))",
            (r, n) -> new Credential(r.getLong("id"), r.getString("full_name"), r.getString("email"), r.getString("password_hash"), r.getString("role_code"), r.getString("status"), r.getInt("failed_login_count"), instant(r.getTimestamp("locked_until"))), email).stream().findFirst();
    }
    public void loginFailed(String email) {
        jdbc.update("UPDATE dbo.users SET failed_login_count=CASE WHEN locked_until IS NOT NULL AND locked_until<=SYSUTCDATETIME() THEN 1 ELSE failed_login_count+1 END, locked_until=CASE WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until<=SYSUTCDATETIME() THEN 0 ELSE failed_login_count END)>=4 THEN DATEADD(MINUTE,15,SYSUTCDATETIME()) ELSE NULL END WHERE email_normalized=LOWER(LTRIM(RTRIM(?))) AND (locked_until IS NULL OR locked_until<=SYSUTCDATETIME())", email);
    }
    public void loginSucceeded(String email) {
        jdbc.update("UPDATE dbo.users SET failed_login_count=0, locked_until=NULL, last_login_at=SYSUTCDATETIME() WHERE email_normalized=LOWER(LTRIM(RTRIM(?)))", email);
    }
    public List<Account> accounts() {
        Map<Long, List<String>> permissions = new HashMap<>();
        jdbc.query("SELECT user_id, permission_code FROM dbo.user_permissions ORDER BY permission_code", r -> { permissions.computeIfAbsent(r.getLong(1), k -> new ArrayList<>()).add(r.getString(2)); });
        return jdbc.query("SELECT id, full_name, email, role_code, status, created_at FROM dbo.users ORDER BY created_at DESC, id DESC",
            (r, n) -> new Account(r.getLong("id"), r.getString("full_name"), r.getString("email"), r.getString("role_code"), r.getString("status"), instant(r.getTimestamp("created_at")), permissions.getOrDefault(r.getLong("id"), List.of())));
    }
    public Optional<Account> lockAccount(long id) {
        return jdbc.query("SELECT id, full_name, email, role_code, status, created_at FROM dbo.users WITH (UPDLOCK, HOLDLOCK) WHERE id=?",
            (r, n) -> new Account(r.getLong("id"), r.getString("full_name"), r.getString("email"), r.getString("role_code"), r.getString("status"), instant(r.getTimestamp("created_at")), List.of()), id).stream().findFirst();
    }
    public List<String> permissions(long id) { return jdbc.queryForList("SELECT permission_code FROM dbo.user_permissions WHERE user_id=? ORDER BY permission_code", String.class, id); }
    public void status(long id, String status) { jdbc.update("UPDATE dbo.users SET status=?, updated_at=SYSUTCDATETIME() WHERE id=?", status, id); }
    public void permissions(long id, Set<String> permissions, long actor) {
        jdbc.update("DELETE FROM dbo.user_permissions WHERE user_id=?", id);
        for (String permission : permissions) jdbc.update("INSERT INTO dbo.user_permissions(user_id,permission_code,assigned_by) VALUES(?,?,?)", id, permission, actor);
    }
    public Settings settings() {
        Map<String, String> values = new HashMap<>();
        jdbc.query("SELECT config_key,config_value FROM dbo.system_configs WHERE config_key IN ('finance.commission_rate','platform.support_email')", r -> { values.put(r.getString(1), r.getString(2)); });
        try {
            if (!values.containsKey("finance.commission_rate") || !values.containsKey("platform.support_email")) throw new IllegalStateException("Required configuration is missing");
            var commission = json.readTree(values.get("finance.commission_rate")).get("value");
            var email = json.readTree(values.get("platform.support_email")).get("value");
            return new Settings(commission.decimalValue(), email == null || email.isNull() ? "" : email.asText());
        } catch (JsonProcessingException e) { throw new IllegalStateException("Invalid stored configuration", e); }
    }
    public void lockSettings() { jdbc.queryForList("SELECT config_key FROM dbo.system_configs WITH (UPDLOCK, HOLDLOCK) WHERE config_key IN ('finance.commission_rate','platform.support_email')"); }
    public void settings(SettingsChange change, long actor) {
        updateConfig("finance.commission_rate", change.commissionRate(), actor);
        updateConfig("platform.support_email", change.supportEmail(), actor);
    }
    private void updateConfig(String key, Object value, long actor) {
        if (jdbc.update("UPDATE dbo.system_configs SET config_value=?, updated_by=?, updated_at=SYSUTCDATETIME() WHERE config_key=?", serialize(Map.of("value", value)), actor, key) != 1) throw new IllegalStateException("Required configuration is missing");
    }
    public List<Payment> payments() {
        return jdbc.query("SELECT id, merchant_reference, amount, commission_rate_snapshot, status, gateway, gateway_transaction_id, paid_at FROM dbo.payments WHERE status='SUCCEEDED' AND gateway='VNPAY' AND NULLIF(LTRIM(RTRIM(gateway_transaction_id)), '') IS NOT NULL AND paid_at IS NOT NULL AND currency='VND' ORDER BY paid_at DESC, id DESC",
            (r, n) -> new Payment(r.getLong("id"), r.getString("merchant_reference"), r.getBigDecimal("amount"), r.getBigDecimal("commission_rate_snapshot"), r.getString("status"), r.getString("gateway"), r.getString("gateway_transaction_id"), instant(r.getTimestamp("paid_at"))));
    }
    public List<Audit> audit() {
        return jdbc.query("SELECT a.id, a.actor_id, COALESCE(u.full_name, 'System') actor, a.action, a.entity_type, a.entity_id, a.reason, a.ip_address, a.created_at FROM dbo.audit_logs a LEFT JOIN dbo.users u ON u.id=a.actor_id ORDER BY a.created_at DESC, a.id DESC",
            (r, n) -> new Audit(r.getLong("id"), r.getString("actor"), r.getObject("actor_id", Long.class), r.getString("action"), r.getString("entity_type") + ":" + r.getString("entity_id"), r.getString("reason"), r.getString("ip_address"), instant(r.getTimestamp("created_at"))));
    }
    public void audit(long actor, String action, String entity, String id, Object before, Object after, String reason, String ip) {
        jdbc.update("INSERT INTO dbo.audit_logs(actor_id,action,entity_type,entity_id,old_values,new_values,reason,ip_address) VALUES(?,?,?,?,?,?,?,?)", actor, action, entity, id, serialize(before), serialize(after), reason, ip);
    }
    private String serialize(Object value) { try { return json.writeValueAsString(value); } catch (JsonProcessingException e) { throw new IllegalStateException("Cannot record administration change", e); } }
    private static Instant instant(Timestamp value) { return value == null ? null : value.toLocalDateTime().toInstant(java.time.ZoneOffset.UTC); }
}
