package com.happyprogramming.service;

import com.happyprogramming.dto.PublicContactResponse;
import com.happyprogramming.repository.AdminRepository;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicContactService {
    private final AdminRepository repository;
    private final Validator validator;

    public PublicContactService(AdminRepository repository, Validator validator) {
        this.repository = repository;
        this.validator = validator;
    }

    @Transactional(readOnly = true)
    public PublicContactResponse contact() {
        var contact = new PublicContactResponse(repository.supportEmail().trim());
        if (!validator.validate(contact).isEmpty()) throw new IllegalStateException("Invalid support contact configuration");
        return contact;
    }
}
