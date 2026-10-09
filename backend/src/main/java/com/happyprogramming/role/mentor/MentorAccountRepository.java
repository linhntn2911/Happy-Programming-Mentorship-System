package com.happyprogramming.role.mentor;

import com.happyprogramming.role.mentor.MentorAccount;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MentorAccountRepository extends JpaRepository<MentorAccount, Long> {
}
