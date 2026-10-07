package vn.happyprogramming.mentor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class MentorPersistenceMappingTest {
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void mentorProfileUsesOwningUserIdAsPrimaryKey() throws Exception {
        assertTrue(MentorProfile.class.getDeclaredField("userId").isAnnotationPresent(Id.class));
    }

    @Test
    void mentorSkillUsesEmbeddedKeyAndMapsBothRelationships() throws Exception {
        assertTrue(MentorSkill.class.getDeclaredField("id").isAnnotationPresent(EmbeddedId.class));

        var mentorField = MentorSkill.class.getDeclaredField("mentor");
        var skillField = MentorSkill.class.getDeclaredField("skill");
        assertTrue(mentorField.isAnnotationPresent(ManyToOne.class));
        assertTrue(skillField.isAnnotationPresent(ManyToOne.class));
        assertEquals("mentor_id", mentorField.getAnnotation(JoinColumn.class).name());
        assertEquals("skill_id", skillField.getAnnotation(JoinColumn.class).name());
        assertEquals("mentorId", mentorField.getAnnotation(MapsId.class).value());
        assertEquals("skillId", skillField.getAnnotation(MapsId.class).value());
    }

    @Test
    void mentorSkillIdUsesBothKeysForEquality() {
        var first = new MentorSkillId(23L, 7L);
        var samePair = new MentorSkillId(23L, 7L);
        var differentMentor = new MentorSkillId(24L, 7L);

        assertEquals(first, samePair);
        assertEquals(first.hashCode(), samePair.hashCode());
        assertFalse(first.equals(differentMentor));
    }

    @Test
    void skillEntityMapsTheActiveFlagFromTheExistingCatalogTable() throws Exception {
        assertEquals("skills", Skill.class.getAnnotation(Table.class).name());
        assertEquals("is_active", Skill.class.getDeclaredField("active")
                .getAnnotation(jakarta.persistence.Column.class).name());
    }

    @Test
    void profileRequestRejectsBiographyShorterThanSchemaMinimum() {
        var request = new MentorProfileRequest(
                "Backend mentor",
                "Too short",
                new BigDecimal("5.0"),
                "",
                "",
                "",
                List.of(1L)
        );

        assertFalse(validator.validate(request).isEmpty());
    }

    @Test
    void profileRequestRejectsBiographyWhoseTrimmedLengthIsBelowSchemaMinimum() {
        var request = new MentorProfileRequest(
                "Backend mentor",
                "A" + " ".repeat(49),
                new BigDecimal("5.0"),
                "",
                "",
                "",
                List.of(1L)
        );

        assertFalse(validator.validate(request).isEmpty());
    }

    @Test
    void profileRequestAcceptsValidProfileData() {
        var request = new MentorProfileRequest(
                "Backend engineering mentor",
                "I help developers design reliable services and grow their engineering practice.",
                new BigDecimal("6.5"),
                "https://github.com/example",
                "",
                "https://example.dev",
                List.of(1L, 2L)
        );

        assertTrue(validator.validate(request).isEmpty());
    }

    @Test
    void profileRequestRejectsExperienceAboveSchemaLimit() {
        var request = new MentorProfileRequest(
                "Backend engineering mentor",
                "I help developers design reliable services and grow their engineering practice.",
                new BigDecimal("80.1"),
                "",
                "",
                "",
                List.of(1L)
        );

        assertFalse(validator.validate(request).isEmpty());
    }

    @Test
    void profileRequestRejectsNonHttpProfessionalLinks() {
        var request = new MentorProfileRequest(
                "Backend engineering mentor",
                "I help developers design reliable services and grow their engineering practice.",
                new BigDecimal("6.5"),
                "javascript:alert(1)",
                "",
                "",
                List.of(1L)
        );

        assertFalse(validator.validate(request).isEmpty());
    }

    @Test
    void profileRequestRequiresAtLeastOneSkill() {
        var request = new MentorProfileRequest(
                "Backend engineering mentor",
                "I help developers design reliable services and grow their engineering practice.",
                new BigDecimal("6.5"),
                "",
                "",
                "",
                List.of()
        );

        assertFalse(validator.validate(request).isEmpty());
    }
}
