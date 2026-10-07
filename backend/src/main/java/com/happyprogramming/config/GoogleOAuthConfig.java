package com.happyprogramming.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.*;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.*;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

@Configuration
@Conditional(GoogleOAuthCredentialsCondition.class)
public class GoogleOAuthConfig {
    @Bean
    ClientRegistrationRepository googleRegistration(
        @Value("${hpms.google.client-id:}") String id,
        @Value("${hpms.google.client-secret:}") String secret,
        @Value("${hpms.google.redirect-uri:http://localhost:8080/login/oauth2/code/google}") String redirect) {
        return new InMemoryClientRegistrationRepository(CommonOAuth2Provider.GOOGLE.getBuilder("google")
            .clientId(id).clientSecret(secret).scope("openid", "profile", "email").redirectUri(redirect).build());
    }
}

class GoogleOAuthCredentialsCondition implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        var environment = context.getEnvironment();
        return environment.getProperty("hpms.google.enabled", Boolean.class, false)
            && StringUtils.hasText(environment.getProperty("hpms.google.client-id"))
            && StringUtils.hasText(environment.getProperty("hpms.google.client-secret"));
    }
}
