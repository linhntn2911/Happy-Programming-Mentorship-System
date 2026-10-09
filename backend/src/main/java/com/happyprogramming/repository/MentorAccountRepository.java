package com.happyprogramming.repository;

import com.happyprogramming.entity.MentorAccount;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MentorAccountRepository extends JpaRepository<MentorAccount, Long> {
}
