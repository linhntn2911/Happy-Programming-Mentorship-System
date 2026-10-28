package com.happyprogramming.service;
import com.happyprogramming.dto.*;
import com.happyprogramming.repository.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class OperationalSettingsServiceTest {
 @Test void validatesAndAuditsAtomicUpdate(){
  try(var factory=Validation.buildDefaultValidatorFactory()){
   var repo=mock(OperationalSettingsRepository.class);var audit=mock(AdminRepository.class);var service=new OperationalSettingsService(repo,audit,factory.getValidator());
   var before=new OperationalSettings(false,"");var after=new OperationalSettings(true,"Scheduled work");when(repo.read()).thenReturn(before);
   var actor=new AdminDtos.Session(1,"Admin","admin@example.test");
   service.update(new OperationalSettings.Change(after,"  Review  "),actor,"127.0.0.1");
   var order=inOrder(repo,audit);order.verify(repo).lock();order.verify(repo).read();order.verify(repo).write(after,1);order.verify(audit).audit(1,"OPERATIONS_SETTINGS_CHANGED","SYSTEM_CONFIG","platform.operations",before,after,"Review","127.0.0.1");
   clearInvocations(repo,audit);
   assertThrows(org.springframework.web.server.ResponseStatusException.class,()->service.update(new OperationalSettings.Change(after," "),actor,"ip"));verifyNoInteractions(repo,audit);
  }
 }
 @Test void rejectsInvalidStoredState(){try(var factory=Validation.buildDefaultValidatorFactory()){
  var repo=mock(OperationalSettingsRepository.class);when(repo.read()).thenReturn(new OperationalSettings(null,""));
  assertThrows(IllegalStateException.class,()->new OperationalSettingsService(repo,mock(AdminRepository.class),factory.getValidator()).read());
 }}
}
