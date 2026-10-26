package com.happyprogramming.service;

import com.happyprogramming.dto.OperationalSettings;
import com.happyprogramming.dto.AdminDtos.Session;
import com.happyprogramming.repository.*;
import jakarta.validation.Validator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OperationalSettingsService {
    private final OperationalSettingsRepository repository;
    private final AdminRepository audit;
    private final Validator validator;
    public OperationalSettingsService(OperationalSettingsRepository repository,AdminRepository audit,Validator validator){this.repository=repository;this.audit=audit;this.validator=validator;}
    @Transactional(readOnly=true)
    public OperationalSettings read(){
        var result=repository.read();
        if(result==null||!validator.validate(result).isEmpty())throw new IllegalStateException("Invalid operational configuration");
        return result;
    }
    @Transactional
    public void update(OperationalSettings.Change change,Session actor,String ip){
        if(change==null||!validator.validate(change).isEmpty())throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Invalid operational settings.");
        repository.lock();var before=read();repository.write(change.settings(),actor.id());
        audit.audit(actor.id(),"OPERATIONS_SETTINGS_CHANGED","SYSTEM_CONFIG","platform.operations",before,change.settings(),change.reason().trim(),ip);
    }
}
