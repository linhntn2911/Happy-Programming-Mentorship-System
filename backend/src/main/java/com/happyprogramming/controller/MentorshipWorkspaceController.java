package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.MentorshipWorkspaceDetail;
import com.happyprogramming.dto.MentorshipWorkspaceSummary;
import com.happyprogramming.dto.SendWorkspaceMessageRequest;
import com.happyprogramming.dto.WorkspaceMessageDto;
import com.happyprogramming.service.MentorshipWorkspaceService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/mentorship-workspaces")
public class MentorshipWorkspaceController {
    private final MentorshipWorkspaceService service;

    public MentorshipWorkspaceController(MentorshipWorkspaceService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<MentorshipWorkspaceSummary>> listMine() {
        return ApiResponse.ok(service.listMine());
    }

    @GetMapping("/{conversationId}")
    public ApiResponse<MentorshipWorkspaceDetail> get(
            @PathVariable long conversationId) {
        return ApiResponse.ok(service.get(conversationId));
    }

    @PostMapping("/{conversationId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WorkspaceMessageDto> send(
            @PathVariable long conversationId,
            @Valid @RequestBody SendWorkspaceMessageRequest request) {
        return ApiResponse.ok("Message sent.", service.send(conversationId, request));
    }

    @PostMapping(value = "/{conversationId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WorkspaceMessageDto> upload(
            @PathVariable long conversationId,
            @RequestParam("clientMessageKey") String clientMessageKey,
            @RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("File uploaded.", service.upload(conversationId, clientMessageKey, file));
    }

    @GetMapping("/{conversationId}/messages/{messageId}/file")
    public ResponseEntity<byte[]> download(
            @PathVariable long conversationId,
            @PathVariable long messageId) {
        var file = service.download(conversationId, messageId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(file.mimeType()))
                .contentLength(file.sizeBytes())
                .body(file.content());
    }

    @PostMapping("/{conversationId}/read")
    public ApiResponse<Void> markRead(@PathVariable long conversationId) {
        service.markRead(conversationId);
        return ApiResponse.ok("Messages marked as read.", null);
    }
}
