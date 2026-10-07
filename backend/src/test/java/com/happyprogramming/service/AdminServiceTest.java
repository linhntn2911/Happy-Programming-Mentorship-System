package com.happyprogramming.service;

import com.happyprogramming.dto.AdminDtos;
import com.happyprogramming.repository.AdminRepository;
import com.happyprogramming.service.AdminService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.happyprogramming.dto.AdminDtos.*;

class AdminServiceTest {
    AdminRepository repository;
    AdminService service;
    Session actor = new Session(1, "Admin", "admin@example.com");
    @BeforeEach void setup() { repository = mock(AdminRepository.class); service = new AdminService(repository); }
    Account account(long id, String role) { return new Account(id, "Member", "member@example.com", role, "ACTIVE", Instant.now(), List.of()); }
    @Test void protectsAdminAccountsAndSelf() {
        when(repository.lockAccount(1)).thenReturn(Optional.of(account(1, "ADMIN")));
        assertThrows(ResponseStatusException.class, () -> service.status(1, new StatusChange("LOCKED", "Review"), actor, "127.0.0.1"));
        verify(repository, never()).status(anyLong(), anyString());
    }
    @Test void writesStatusAndAuditTogether() {
        when(repository.lockAccount(2)).thenReturn(Optional.of(account(2, "MENTEE")));
        service.status(2, new StatusChange("LOCKED", " Review "), actor, "127.0.0.1");
        verify(repository).status(2, "LOCKED");
        verify(repository).audit(1, "ACCOUNT_STATUS_CHANGED", "USER", "2", Map.of("status", "ACTIVE"), Map.of("status", "LOCKED"), "Review", "127.0.0.1");
    }
    @Test void rejectsUnknownPermissionAndNonStaffTarget() {
        assertThrows(ResponseStatusException.class, () -> service.permissions(2, new PermissionChange(Set.of("ADMIN"), "Review"), actor, "127.0.0.1"));
        when(repository.lockAccount(2)).thenReturn(Optional.of(account(2, "MENTEE")));
        assertThrows(ResponseStatusException.class, () -> service.permissions(2, new PermissionChange(Set.of(), "Review"), actor, "127.0.0.1"));
        verify(repository, never()).permissions(anyLong(), anySet(), anyLong());
    }
    @Test void rechecksCurrentAdminStatus() {
        when(repository.credential(actor.email())).thenReturn(Optional.of(new AdminRepository.Credential(1, "Admin", actor.email(), "hash", "ADMIN", "LOCKED", 0, null)));
        assertThrows(ResponseStatusException.class, () -> service.requireAdmin(actor.email()));
    }
    @Test void reportsMissingAccount() {
        when(repository.lockAccount(99)).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.status(99, new StatusChange("ACTIVE", "Review"), actor, "127.0.0.1")).getStatusCode().value());
    }
}
