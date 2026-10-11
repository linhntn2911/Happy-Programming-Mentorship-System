package com.happyprogramming.scheduler;

import com.happyprogramming.service.MentorWalletService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "hpms.wallet.release.enabled", havingValue = "true")
public class MentorWalletReleaseJob {
    private final MentorWalletService wallet;
    public MentorWalletReleaseJob(MentorWalletService wallet) { this.wallet = wallet; }

    @Scheduled(fixedDelayString = "${hpms.wallet.release-scan-ms:60000}")
    public void releaseMaturedMentorEarnings() { wallet.releaseMaturedPayments(); }
}
