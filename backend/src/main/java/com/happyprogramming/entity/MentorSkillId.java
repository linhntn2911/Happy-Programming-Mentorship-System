package com.happyprogramming.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class MentorSkillId implements Serializable {
    @Column(name = "mentor_id", nullable = false)
    private Long mentorId;

    @Column(name = "skill_id", nullable = false)
    private Long skillId;

    protected MentorSkillId() {
    }

    public MentorSkillId(Long mentorId, Long skillId) {
        this.mentorId = mentorId;
        this.skillId = skillId;
    }

    public Long getMentorId() {
        return mentorId;
    }

    public Long getSkillId() {
        return skillId;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof MentorSkillId that)) {
            return false;
        }
        return Objects.equals(mentorId, that.mentorId)
                && Objects.equals(skillId, that.skillId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(mentorId, skillId);
    }
}
