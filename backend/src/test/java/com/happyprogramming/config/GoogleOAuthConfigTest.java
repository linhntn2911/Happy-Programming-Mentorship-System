package com.happyprogramming.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;

class GoogleOAuthConfigTest {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(GoogleOAuthConfig.class);

    @Test
    void googleLoginRemainsDisabledWhenCredentialsAreMissing() {
        contextRunner
                .withPropertyValues("hpms.google.enabled=true")
                .run(context -> assertFalse(context.containsBean("googleRegistration")));
    }

    @Test
    void googleLoginCreatesSpringRegistrationWhenEnabledAndConfigured() {
        contextRunner
                .withPropertyValues(
                        "hpms.google.enabled=true",
                        "hpms.google.client-id=test-client-id",
                        "hpms.google.client-secret=test-client-secret",
                        "hpms.google.redirect-uri=http://localhost:8080/login/oauth2/code/google")
                .run(context -> {
                    assertTrue(context.containsBean("googleRegistration"));
                    assertTrue(context.getBean(ClientRegistrationRepository.class)
                            .findByRegistrationId("google") != null);
                });
    }
}
