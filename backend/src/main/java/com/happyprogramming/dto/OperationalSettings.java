package com.happyprogramming.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record OperationalSettings(@NotNull Boolean maintenance,
                                  @NotNull @Size(max=2000) String announcement,
                                  @NotNull @Min(30) @Max(3600) Integer otpResendSeconds,
                                  @NotNull @Min(1) @Max(30) Integer otpExpiryMinutes,
                                  @NotNull @DecimalMin("10000") @DecimalMax("999999999") @Digits(integer=9,fraction=0) java.math.BigDecimal withdrawalThreshold,
                                  @NotNull @DecimalMin("0") @DecimalMax("10000") @Digits(integer=5,fraction=0) java.math.BigDecimal withdrawalFee,
                                  @NotNull @Min(1) @Max(90) Integer earningsHoldDays) {
    public OperationalSettings(Boolean maintenance,String announcement){this(maintenance,announcement,60,10,new java.math.BigDecimal("10000"),java.math.BigDecimal.ZERO,7);}
    public OperationalSettings { if (announcement != null) announcement = announcement.trim(); }
    public record Change(@NotNull @Valid OperationalSettings settings,
                         @NotBlank @Size(max=1000) String reason) { }
}
