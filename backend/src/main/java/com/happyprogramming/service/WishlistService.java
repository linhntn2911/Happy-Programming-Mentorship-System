package com.happyprogramming.service;

import com.happyprogramming.dto.WishlistDtos;
import com.happyprogramming.entity.User;
import com.happyprogramming.entity.Wishlist;
import com.happyprogramming.entity.WishlistId;
import com.happyprogramming.repository.UserRepository;
import com.happyprogramming.repository.WishlistRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;

@Service
public class WishlistService {
    private final WishlistRepository wishlists;
    private final UserRepository users;
    public WishlistService(WishlistRepository wishlists, UserRepository users) { this.wishlists = wishlists; this.users = users; }
    @Transactional(readOnly = true)
    public WishlistDtos.ListResponse list(Long menteeId) { requireMentee(menteeId); return new WishlistDtos.ListResponse(wishlists.findPublicMentorSlugs(menteeId)); }
    @Transactional
    public WishlistDtos.ToggleResponse save(Long menteeId, String mentorSlug) {
        User mentee = requireMentee(menteeId); String slug = normalizeSlug(mentorSlug); Long mentorId = publicMentorId(slug);
        if (mentee.getId().equals(mentorId)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You cannot save your own mentor profile.");
        wishlists.findById(new WishlistId(menteeId, mentorId)).orElseGet(() -> wishlists.save(new Wishlist(menteeId, mentorId, LocalDateTime.now())));
        return new WishlistDtos.ToggleResponse(slug, true);
    }
    @Transactional
    public WishlistDtos.ToggleResponse remove(Long menteeId, String mentorSlug) {
        requireMentee(menteeId); String slug = normalizeSlug(mentorSlug); Long mentorId = mentorId(slug);
        wishlists.deleteById(new WishlistId(menteeId, mentorId));
        return new WishlistDtos.ToggleResponse(slug, false);
    }
    private User requireMentee(Long id) {
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in to manage your wishlist.");
        User user = users.findForLoginById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account unavailable."));
        if (!"ACTIVE".equals(user.getStatus()) || !user.hasRole("MENTEE")) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only active mentees can manage a wishlist.");
        return user;
    }
    private Long publicMentorId(String slug) { return wishlists.findPublicMentorIdBySlug(slug).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mentor profile is not available.")); }
    private Long mentorId(String slug) { return wishlists.findMentorIdBySlug(slug).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Mentor profile is not available.")); }
    private String normalizeSlug(String raw) { String slug = raw == null ? "" : raw.trim(); if (!slug.matches("[a-z0-9-]{1,200}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid mentor profile."); return slug; }
}
