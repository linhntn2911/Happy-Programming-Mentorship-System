package com.happyprogramming.role.staff;

import com.happyprogramming.role.auth.AuthenticatedUser;
import com.happyprogramming.role.admin.AdminRepository;
import com.happyprogramming.role.admin.AdminService;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.Instant;
import java.util.Set;

@Service
public class StaffAccessService {
    private final AdminRepository repository;
    public StaffAccessService(AdminRepository repository) { this.repository=repository; }
    public Set<String> permissions(AuthenticatedUser principal) {
        if (principal==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Please log in.");
        var u=repository.credential(principal.email()).orElseThrow(() -> denied());
        if (!"ACTIVE".equals(u.status()) || u.lockedUntil()!=null && u.lockedUntil().isAfter(Instant.now()))
            throw denied();
        if ("ADMIN".equals(u.role())) return AdminService.PERMISSIONS;
        if (!repository.hasRole(u.id(),"STAFF")) throw denied();
        return Set.copyOf(repository.permissions(u.id()));
    }
    private static ResponseStatusException denied() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN,"Active staff access is required.");
    }
}
