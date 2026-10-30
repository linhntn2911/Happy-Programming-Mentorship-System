package com.happyprogramming.controller;

import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.DisputeDtos;
import com.happyprogramming.service.DisputeService;
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
@RequestMapping("/api/disputes")
public class DisputeController {
    private final DisputeService service;

    public DisputeController(DisputeService service) {
        this.service = service;
    }

    @GetMapping("/eligible-targets")
    public ApiResponse<List<DisputeDtos.EligibleTarget>> eligibleTargets() {
        return ApiResponse.ok(service.eligibleTargets());
    }

    @GetMapping("/target-by-request/{requestId}")
    public ApiResponse<DisputeDtos.EligibleTarget> targetByRequest(@PathVariable long requestId) {
        return ApiResponse.ok(service.targetByRequestId(requestId));
    }

    @GetMapping("/mine")
    public ApiResponse<List<DisputeDtos.Summary>> mine() {
        return ApiResponse.ok(service.mine());
    }

    @GetMapping("/{id}")
    public ApiResponse<DisputeDtos.Detail> detail(@PathVariable long id) {
        return ApiResponse.ok(service.detail(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<DisputeDtos.Detail> submit(
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) Long targetId,
            @RequestParam(required = false) Long requestId,
            @RequestParam String category,
            @RequestParam String description,
            @RequestParam boolean termsAccepted,
            @RequestParam("evidence") List<MultipartFile> evidence,
            @RequestParam(required = false) String bankName,
            @RequestParam(required = false) String accountNumber,
            @RequestParam(required = false) String accountName) {
        return ApiResponse.ok("Dispute submitted.",
                service.submit(targetType, targetId, requestId, category, description, termsAccepted, evidence, bankName, accountNumber, accountName));
    }

    @GetMapping("/{id}/evidence/{evidenceId}")
    public ResponseEntity<byte[]> evidence(@PathVariable long id, @PathVariable long evidenceId) {
        var file = service.download(id, evidenceId);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(file.fileName(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(file.mimeType()))
                .contentLength(file.sizeBytes())
                .body(file.content());
    }
}
