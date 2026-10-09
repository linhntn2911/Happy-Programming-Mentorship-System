package com.happyprogramming.role.mentee;

import com.happyprogramming.role.auth.User;
import com.happyprogramming.role.mentee.Wishlist;
import com.happyprogramming.role.mentee.WishlistId;
import com.happyprogramming.role.auth.UserRepository;
import com.happyprogramming.role.mentee.WishlistRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WishlistServiceTest {
    @Mock WishlistRepository wishlists;
    @Mock UserRepository users;
    @Mock User mentee;
    private WishlistService service;

    @BeforeEach void setUp() { service = new WishlistService(wishlists, users); }

    private void activeMentee() {
        when(users.findForLoginById(7L)).thenReturn(Optional.of(mentee));
        when(mentee.getStatus()).thenReturn("ACTIVE");
        when(mentee.hasRole("MENTEE")).thenReturn(true);
    }

    @Test void listIsScopedToTheAuthenticatedMentee() {
        activeMentee();
        when(wishlists.findPublicMentorSlugs(7L)).thenReturn(List.of("mentor-a"));
        assertEquals(List.of("mentor-a"), service.list(7L).mentorSlugs());
        verify(wishlists).findPublicMentorSlugs(7L);
    }

    @Test void savingAnExistingEntryIsIdempotent() {
        activeMentee();
        when(mentee.getId()).thenReturn(7L);
        when(wishlists.findPublicMentorIdBySlug("mentor-a")).thenReturn(Optional.of(11L));
        when(wishlists.findById(new WishlistId(7L, 11L))).thenReturn(Optional.of(mock(Wishlist.class)));
        assertTrue(service.save(7L, "mentor-a").saved());
        verify(wishlists, never()).save(any());
    }

    @Test void savingAnUnpublishedMentorIsRejected() {
        activeMentee();
        when(wishlists.findPublicMentorIdBySlug("private-mentor")).thenReturn(Optional.empty());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class,
                () -> service.save(7L, "private-mentor")).getStatusCode());
        verify(wishlists, never()).save(any());
    }

    @Test void removeTargetsOnlyTheCurrentMenteeAndMayBeRepeated() {
        activeMentee();
        when(wishlists.findMentorIdBySlug("mentor-a")).thenReturn(Optional.of(11L));
        assertFalse(service.remove(7L, "mentor-a").saved());
        verify(wishlists).deleteById(new WishlistId(7L, 11L));
    }

    @Test void guestsAndNonMenteesCannotReadWishlist() {
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ResponseStatusException.class,
                () -> service.list(null)).getStatusCode());
        when(users.findForLoginById(7L)).thenReturn(Optional.of(mentee));
        when(mentee.getStatus()).thenReturn("ACTIVE");
        when(mentee.hasRole("MENTEE")).thenReturn(false);
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> service.list(7L)).getStatusCode());
        verifyNoInteractions(wishlists);
    }
}
