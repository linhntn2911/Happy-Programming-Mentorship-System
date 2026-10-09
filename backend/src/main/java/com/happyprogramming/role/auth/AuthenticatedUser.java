package com.happyprogramming.role.auth;

import com.happyprogramming.role.auth.User;
import java.io.Serializable;

public record AuthenticatedUser(Long id, String name, String email, String role, java.util.Set<String> roles) implements Serializable {
    public AuthenticatedUser(Long id, String name, String email, String role) {
        this(id, name, email, role, java.util.Set.of(role));
    }
    public static AuthenticatedUser from(User user) {
        return from(user, user.getRole());
    }
    public static AuthenticatedUser from(User user, String role) {
        return new AuthenticatedUser(user.getId(), user.getFullName(), user.getEmail(), role, user.getRoles());
    }
}
