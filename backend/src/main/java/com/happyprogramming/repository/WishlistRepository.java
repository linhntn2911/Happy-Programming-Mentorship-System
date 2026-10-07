package com.happyprogramming.repository;

import com.happyprogramming.entity.Wishlist;
import com.happyprogramming.entity.WishlistId;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface WishlistRepository extends JpaRepository<Wishlist, WishlistId> {
    @Query(value = "SELECT mp.user_id FROM dbo.mentor_profiles mp WHERE mp.slug = :slug AND mp.is_public = 1", nativeQuery = true)
    Optional<Long> findPublicMentorIdBySlug(@Param("slug") String slug);
    @Query(value = "SELECT mp.user_id FROM dbo.mentor_profiles mp WHERE mp.slug = :slug", nativeQuery = true)
    Optional<Long> findMentorIdBySlug(@Param("slug") String slug);
    @Query(value = "SELECT mp.slug FROM dbo.wishlists w JOIN dbo.mentor_profiles mp ON mp.user_id = w.mentor_id WHERE w.mentee_id = :menteeId AND mp.is_public = 1 ORDER BY w.created_at DESC", nativeQuery = true)
    List<String> findPublicMentorSlugs(@Param("menteeId") Long menteeId);
}
