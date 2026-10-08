package com.happyprogramming.dto;

import com.happyprogramming.dto.AdminDtos;
import com.happyprogramming.repository.AdminRepository;
import com.happyprogramming.service.AdminService;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

public final class AdminDtos {
    private AdminDtos() { }
    public record Account(long id, String name, String email, String role, String status,
                          Instant createdAt, List<String> permissions) { }
    public record Session(long id, String name, String email) { }
    public record Audit(long id, String actor, Long actorId, String action, String target, String reason,
                        String ipAddress, Instant createdAt) { }
    public record Payment(long id, String reference, BigDecimal amount, BigDecimal commissionRate,
                          String status, String gateway, String gatewayTransactionId, Instant paidAt) { }
    public record Settings(BigDecimal commissionRate, String supportEmail) { }
    public record Workspace(List<Account> users, List<Audit> audit, List<Payment> payments, Settings settings) { }
    public record StatusChange(@NotNull @Pattern(regexp="ACTIVE|INACTIVE|LOCKED") String status,
                               @NotBlank @Size(max=1000) String reason) { }
    public record PermissionChange(@NotNull @Size(max=4) Set<@NotBlank String> permissions,
                                   @NotBlank @Size(max=1000) String reason) { }
    public record SettingsChange(@NotNull @DecimalMin("0") @DecimalMax("100") @Digits(integer=3, fraction=2) BigDecimal commissionRate,
                                 @NotNull @Email @Size(max=254) String supportEmail,
                                 @NotBlank @Size(max=1000) String reason) { }
}
