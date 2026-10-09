package com.happyprogramming.role.mentee;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "wishlists", schema = "dbo")
@IdClass(WishlistId.class)
public class Wishlist {
    @Id @Column(name = "mentee_id") private Long menteeId;
    @Id @Column(name = "mentor_id") private Long mentorId;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    protected Wishlist() {}
    public Wishlist(Long menteeId, Long mentorId, LocalDateTime createdAt) { this.menteeId = menteeId; this.mentorId = mentorId; this.createdAt = createdAt; }
}
