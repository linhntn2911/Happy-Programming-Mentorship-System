package vn.happyprogramming.mentor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record MentorRequestDecisionRequest(
        @NotBlank @Pattern(regexp = "ACCEPTED|REJECTED") String decision) {
}
