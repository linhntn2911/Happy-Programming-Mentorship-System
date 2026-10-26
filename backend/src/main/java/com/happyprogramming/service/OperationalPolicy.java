package com.happyprogramming.service;

import com.happyprogramming.dto.OperationalSettings;
import com.happyprogramming.repository.SecurityTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
public class OperationalPolicy {
    private final OperationalSettingsService settings;
    private final SecurityTokenRepository tokens;
    public OperationalPolicy(OperationalSettingsService settings, SecurityTokenRepository tokens) {
        this.settings=settings; this.tokens=tokens;
    }
    public OperationalSettings current() { return settings.read(); }
    public boolean coolingDown(long userId, String purpose, LocalDateTime now, int seconds) {
        return tokens.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(userId,purpose)
            .map(t -> t.getCreatedAt().plusSeconds(seconds).isAfter(now)).orElse(false);
    }
    public void requireReady(long userId,String purpose,LocalDateTime now,int seconds) {
        if(coolingDown(userId,purpose,now,seconds))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Please wait before requesting another verification code.");
    }
    public static void validateWithdrawal(BigDecimal amount,OperationalSettings settings) {
        if(amount==null || amount.stripTrailingZeros().scale()>0 || amount.compareTo(settings.withdrawalThreshold())<=0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Withdrawal must be a whole-VND amount greater than "+settings.withdrawalThreshold().toPlainString()+" VND.");
    }
}
