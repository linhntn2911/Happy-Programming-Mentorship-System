package com.happyprogramming.role.mentee;

import java.io.Serializable;
import java.util.Objects;

public class WishlistId implements Serializable {
    private Long menteeId;
    private Long mentorId;
    public WishlistId() {}
    public WishlistId(Long menteeId, Long mentorId) { this.menteeId = menteeId; this.mentorId = mentorId; }
    public Long getMenteeId() { return menteeId; }
    public Long getMentorId() { return mentorId; }
    @Override public boolean equals(Object other) { if (this == other) return true; if (!(other instanceof WishlistId that)) return false; return Objects.equals(menteeId, that.menteeId) && Objects.equals(mentorId, that.mentorId); }
    @Override public int hashCode() { return Objects.hash(menteeId, mentorId); }
}
