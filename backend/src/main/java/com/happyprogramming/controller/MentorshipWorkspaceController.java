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

    @GetMapping("/{subscriptionId}")
    public ApiResponse<MentorshipWorkspaceDetail> get(
            @PathVariable long subscriptionId) {
        return ApiResponse.ok(service.get(subscriptionId));
    }

    @PostMapping("/{subscriptionId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WorkspaceMessageDto> send(
            @PathVariable long subscriptionId,
            @Valid @RequestBody SendWorkspaceMessageRequest request) {
        return ApiResponse.ok("Message sent.", service.send(subscriptionId, request));
    }

    @PostMapping(value = "/{subscriptionId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WorkspaceMessageDto> upload(
            @PathVariable long subscriptionId,
            @RequestParam("clientMessageKey") String clientMessageKey,
            @RequestParam("file") MultipartFile file) {
        return ApiResponse.ok("File uploaded.", service.upload(subscriptionId, clientMessageKey, file));
    }

    @GetMapping("/{subscriptionId}/messages/{messageId}/file")
    public ResponseEntity<byte[]> download(
            @PathVariable long subscriptionId,
            @PathVariable long messageId) {
        var file = service.download(subscriptionId, messageId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(file.mimeType()))
                .contentLength(file.sizeBytes())
                .body(file.content());
    }

    @PostMapping("/{subscriptionId}/read")
    public ApiResponse<Void> markRead(@PathVariable long subscriptionId) {
        service.markRead(subscriptionId);
        return ApiResponse.ok("Messages marked as read.", null);
    }
}
