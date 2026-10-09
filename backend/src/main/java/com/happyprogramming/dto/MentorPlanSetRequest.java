package com.happyprogramming.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record MentorPlanSetRequest(
        @Valid @NotNull @Size(max = 3) List<MentorPlanRequest> plans
) {
}
