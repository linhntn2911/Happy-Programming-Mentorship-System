package com.happyprogramming.service;
import com.happyprogramming.repository.AdminRepository;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
import java.util.Optional;
import java.util.List;
import org.springframework.web.server.ResponseStatusException;
class AdminPayoutHistoryAccessTest {
 @Test void onlyActiveAdminCanReadHistory() {
  for(String role : List.of("ADMIN","STAFF","MENTOR","MENTEE")) {
   var repo=mock(AdminRepository.class);
   when(repo.credential("user")).thenReturn(Optional.of(new AdminRepository.Credential(1,"User","user","",role,"ACTIVE",0,null)));
   when(repo.payoutHistory()).thenReturn(List.of());
   var service=new AdminService(repo);
   if(role.equals("ADMIN")){assertTrue(service.payoutHistory("user").isEmpty());verify(repo).payoutHistory();}
   else {assertThrows(ResponseStatusException.class,()->service.payoutHistory("user"));verify(repo,never()).payoutHistory();}
  }
 }
 @Test void inactiveAdminCannotReadHistory() {
  var repo=mock(AdminRepository.class);
  when(repo.credential("user")).thenReturn(Optional.of(new AdminRepository.Credential(1,"User","user","","ADMIN","INACTIVE",0,null)));
  assertThrows(ResponseStatusException.class,()->new AdminService(repo).payoutHistory("user"));verify(repo,never()).payoutHistory();
 }
}
