package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.DisputeFileDownload;
import com.happyprogramming.dto.MentorDisputeDetail;
import com.happyprogramming.dto.MentorDisputeSummary;
import com.happyprogramming.service.MentorDisputeService;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/mentors/me/disputes")
public class MentorDisputeController {
    private final MentorDisputeService service;

    public MentorDisputeController(MentorDisputeService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<List<MentorDisputeSummary>> list(@RequestParam(value = "status", required = false) String status) {
        return ApiResponse.ok(service.list(status));
    }

    @GetMapping("/{disputeId}")
    public ApiResponse<MentorDisputeDetail> get(@PathVariable long disputeId) {
        return ApiResponse.ok(service.detail(disputeId));
    }

    @PostMapping(value = "/{disputeId}/responses", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MentorDisputeDetail> respond(
            @PathVariable long disputeId,
            @RequestParam("message") String message,
            @RequestParam(value = "files", required = false) List<MultipartFile> files) {
        return ApiResponse.ok("Response submitted for staff review.", service.respond(disputeId, message, files));
    }

    @GetMapping("/{disputeId}/evidence/{evidenceId}/file")
    public ResponseEntity<byte[]> download(@PathVariable long disputeId, @PathVariable long evidenceId) {
        DisputeFileDownload file = service.downloadEvidence(disputeId, evidenceId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(file.mimeType()))
                .contentLength(file.sizeBytes())
                .body(file.content());
    }
}
