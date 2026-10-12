package com.happyprogramming.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

import com.happyprogramming.dto.MentorshipWorkspaceSummary;
import com.happyprogramming.dto.WorkspaceMessageDto;
import com.happyprogramming.dto.WorkspaceFileDownload;
import com.happyprogramming.service.MentorshipWorkspaceService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.mock.web.MockMultipartFile;

@WebMvcTest(MentorshipWorkspaceController.class)
@AutoConfigureMockMvc(addFilters = false)
class MentorshipWorkspaceControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean MentorshipWorkspaceService service;
    @MockitoBean com.happyprogramming.service.StaffAccessService staffAccess;

    @Test
    void listsActiveWorkspaces() throws Exception {
        when(service.listMine()).thenReturn(List.of(new MentorshipWorkspaceSummary(
                30L, 5L, 40L, 20L, "Mentor", "MENTEE", "Standard", "ACTIVE",
                Instant.parse("2026-10-12T00:00:00Z"), Instant.parse("2026-11-12T00:00:00Z"), 4, 60, 3L)));

        mvc.perform(get("/api/mentorship-workspaces"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].subscriptionId").value(30))
                .andExpect(jsonPath("$.data[0].partnerName").value("Mentor"))
                .andExpect(jsonPath("$.data[0].unreadCount").value(3));
    }

    @Test
    void sendsValidatedMessage() throws Exception {
        when(service.send(org.mockito.ArgumentMatchers.eq(30L), any()))
                .thenReturn(new WorkspaceMessageDto(7L, 10L, "Mentee", "TEXT", "Hello", null,
                        Instant.parse("2026-10-12T05:00:00Z"), true, null, null, null, null));

        mvc.perform(post("/api/mentorship-workspaces/30/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"clientMessageKey":"client-1","messageType":"TEXT","body":"Hello"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("Message sent."))
                .andExpect(jsonPath("$.data.id").value(7));
    }

    @Test
    void rejectsBlankMessage() throws Exception {
        mvc.perform(post("/api/mentorship-workspaces/30/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"clientMessageKey":"client-1","messageType":"TEXT","body":" "}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadsWorkspaceFile() throws Exception {
        when(service.upload(org.mockito.ArgumentMatchers.eq(30L),
                org.mockito.ArgumentMatchers.eq("file-1"), any()))
                .thenReturn(new WorkspaceMessageDto(8L, 10L, "Mentee", "FILE", "lesson.pdf", null,
                        Instant.parse("2026-10-12T05:00:00Z"), true,
                        50L, "lesson.pdf", "application/pdf", 3L));
        var file = new MockMultipartFile("file", "lesson.pdf", "application/pdf", "pdf".getBytes());

        mvc.perform(multipart("/api/mentorship-workspaces/30/files")
                        .file(file).param("clientMessageKey", "file-1"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.messageType").value("FILE"))
                .andExpect(jsonPath("$.data.fileName").value("lesson.pdf"));
    }

    @Test
    void downloadsAuthorizedWorkspaceFileAsAttachment() throws Exception {
        when(service.download(30L, 8L))
                .thenReturn(new WorkspaceFileDownload("lesson.pdf", "application/pdf", 3L, "pdf".getBytes()));

        mvc.perform(get("/api/mentorship-workspaces/30/messages/8/file"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(content().bytes("pdf".getBytes()));
    }

    @Test
    void marksWorkspaceMessagesAsRead() throws Exception {
        mvc.perform(post("/api/mentorship-workspaces/30/read"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Messages marked as read."));

        org.mockito.Mockito.verify(service).markRead(30L);
    }
}
