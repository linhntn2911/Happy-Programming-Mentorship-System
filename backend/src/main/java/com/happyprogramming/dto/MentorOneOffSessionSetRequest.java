package com.happyprogramming.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record MentorOneOffSessionSetRequest(
        @Valid @NotNull @Size(max = 20) List<MentorOneOffSessionRequest> sessions
) { }
