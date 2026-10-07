package com.happyprogramming.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.*;

@Configuration
@ConditionalOnProperty(name = "hpms.google.enabled", havingValue = "true")
public class GoogleOAuthConfig {
    @Bean
    ClientRegistrationRepository googleRegistration(
        @Value("${hpms.google.client-id}") String id,
        @Value("${hpms.google.client-secret}") String secret,
        @Value("${hpms.google.redirect-uri}") String redirect) {
        if (id.isBlank() || secret.isBlank()) throw new IllegalStateException("Google OAuth credentials must be configured when enabled.");
        return new InMemoryClientRegistrationRepository(CommonOAuth2Provider.GOOGLE.getBuilder("google")
            .clientId(id).clientSecret(secret).scope("openid", "profile", "email").redirectUri(redirect).build());
    }
}
