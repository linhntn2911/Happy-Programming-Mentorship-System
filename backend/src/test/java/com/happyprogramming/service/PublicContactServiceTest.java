package com.happyprogramming.service;

import com.happyprogramming.dto.AdminDtos;
import com.happyprogramming.repository.AdminRepository;
import jakarta.validation.Validation;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class PublicContactServiceTest {
    @Test void normalizesAndValidatesStoredAndSubmittedAddresses() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var repository = mock(AdminRepository.class);
            var service = new PublicContactService(repository, validator);
            when(repository.supportEmail()).thenReturn(" help@example.com ", "", "not-an-email");
            assertEquals("help@example.com", service.contact().supportEmail());
            assertEquals("", service.contact().supportEmail());
            assertThrows(IllegalStateException.class, service::contact);
            var change = new AdminDtos.SettingsChange(new BigDecimal("15"), " help@example.com ", "Update contact");
            assertEquals("help@example.com", change.supportEmail());
            assertTrue(validator.validate(change).isEmpty());
            assertFalse(validator.validate(new AdminDtos.SettingsChange(new BigDecimal("15"), "bad", "Update")).isEmpty());
        }
    }
}
