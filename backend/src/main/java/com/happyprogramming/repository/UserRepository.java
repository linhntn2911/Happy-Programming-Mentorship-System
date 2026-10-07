package com.happyprogramming.repository;

import com.happyprogramming.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.emailNormalized = :email")
    Optional<User> findForLogin(@Param("email") String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findForLoginById(@Param("id") Long id);

    @Query("select count(u) > 0 from User u where u.emailNormalized = :email")
    boolean existsByEmailNormalized(@Param("email") String email);
}
