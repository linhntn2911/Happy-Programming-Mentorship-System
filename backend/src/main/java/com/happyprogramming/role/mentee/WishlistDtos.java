package com.happyprogramming.role.mentee;

import java.util.List;

public final class WishlistDtos {
    private WishlistDtos() {}
    public record ListResponse(List<String> mentorSlugs) {}
    public record ToggleResponse(String mentorSlug, boolean saved) {}
}
