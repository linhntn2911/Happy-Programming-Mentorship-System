package com.happyprogramming.service;

import com.happyprogramming.dto.AuthenticatedUser;
import com.happyprogramming.dto.MentorshipWorkspaceDetail;
import com.happyprogramming.dto.MentorshipWorkspaceSummary;
import com.happyprogramming.dto.SendWorkspaceMessageRequest;
import com.happyprogramming.dto.WorkspaceMessageDto;
import com.happyprogramming.dto.WorkspaceFileDownload;
import com.happyprogramming.dto.WorkspaceOneOffBookingDto;
import com.happyprogramming.repository.MentorshipWorkspaceRepository;
import com.happyprogramming.repository.MentorshipWorkspaceRepository.MessageRow;
import com.happyprogramming.repository.MentorshipWorkspaceRepository.OneOffBookingRow;
import com.happyprogramming.repository.MentorshipWorkspaceRepository.WorkspaceRow;
import java.util.List;
import java.util.HexFormat;
import java.util.Set;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MentorshipWorkspaceService {
    private static final int MESSAGE_LIMIT = 100;
    private static final long MAX_FILE_BYTES = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_FILE_TYPES = Set.of(
            "application/pdf", "application/zip", "application/x-zip-compressed",
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain", "text/csv", "image/png", "image/jpeg", "image/gif", "image/webp");
    private final MentorshipWorkspaceRepository repository;

    public MentorshipWorkspaceService(MentorshipWorkspaceRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<MentorshipWorkspaceSummary> listMine() {
        long userId = currentUserId();
        return repository.findForUser(userId).stream()
                .map(row -> toSummary(row, userId))
                .toList();
    }

    @Transactional(readOnly = true)
    public MentorshipWorkspaceDetail get(long conversationId) {
        long userId = currentUserId();
        WorkspaceRow row = requireWorkspace(conversationId, userId);
        requireConversation(row);
        List<WorkspaceMessageDto> messages = repository.findLatestMessages(row.conversationId(), MESSAGE_LIMIT)
                .stream().map(message -> toMessage(message, userId)).toList();
        List<WorkspaceOneOffBookingDto> oneOffSessions = repository.findOneOffBookings(row.conversationId())
                .stream().map(MentorshipWorkspaceService::toOneOffBooking).toList();
        return toDetail(row, userId, oneOffSessions, messages);
    }

    @Transactional
    public WorkspaceMessageDto send(long conversationId, SendWorkspaceMessageRequest request) {
        long userId = currentUserId();
        WorkspaceRow row = requireWorkspace(conversationId, userId);
        requireConversation(row);

        String body = request.body().trim();
        if (body.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message body is required.");
        }
        String clientKey = request.clientMessageKey().trim();
        String codeLanguage = "CODE".equals(request.messageType())
                ? trimToNull(request.codeLanguage()) : null;

        var existing = repository.findBySenderAndClientKey(userId, clientKey);
        if (existing.isPresent()) return toMessage(existing.get(), userId);

        try {
            return toMessage(repository.insertMessage(
                    row.conversationId(), userId, clientKey,
                    request.messageType(), body, codeLanguage), userId);
        } catch (DuplicateKeyException duplicate) {
            return repository.findBySenderAndClientKey(userId, clientKey)
                    .map(message -> toMessage(message, userId))
                    .orElseThrow(() -> duplicate);
        }
    }

    @Transactional
    public WorkspaceMessageDto upload(long conversationId, String clientMessageKey, MultipartFile file) {
        long userId = currentUserId();
        WorkspaceRow row = requireWorkspace(conversationId, userId);
        requireConversation(row);
        String clientKey = requiredClientKey(clientMessageKey);

        var existing = repository.findBySenderAndClientKey(userId, clientKey);
        if (existing.isPresent()) return toMessage(existing.get(), userId);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a file to upload.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Files must be 10 MB or smaller.");
        }
        String mimeType = trimToNull(file.getContentType());
        if (mimeType == null || !ALLOWED_FILE_TYPES.contains(mimeType.toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This file type is not supported. Upload a document, archive, text file, or image.");
        }
        String fileName = safeFileName(file.getOriginalFilename());
        try {
            byte[] content = file.getBytes();
            return toMessage(repository.insertFileMessage(
                    row.conversationId(), userId, clientKey, fileName,
                    mimeType.toLowerCase(), content, sha256(content)), userId);
        } catch (java.io.IOException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The selected file could not be read.");
        }
    }

    @Transactional(readOnly = true)
    public WorkspaceFileDownload download(long conversationId, long messageId) {
        long userId = currentUserId();
        WorkspaceRow row = requireWorkspace(conversationId, userId);
        requireConversation(row);
        if (messageId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid workspace file.");
        }
        var file = repository.findFile(row.conversationId(), messageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace file not found."));
        return new WorkspaceFileDownload(file.fileName(), file.mimeType(), file.sizeBytes(), file.content());
    }

    @Transactional
    public void markRead(long conversationId) {
        long userId = currentUserId();
        WorkspaceRow row = requireWorkspace(conversationId, userId);
        requireConversation(row);
        repository.markRead(row.conversationId(), userId, row.mentorId() == userId);
    }

    private WorkspaceRow requireWorkspace(long conversationId, long userId) {
        if (conversationId <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid mentorship workspace.");
        }
        WorkspaceRow row = repository.findAccessibleByConversationId(conversationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Active mentorship workspace not found."));
        if (row.mentorId() != userId && row.menteeId() != userId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You are not a member of this mentorship workspace.");
        }
        return row;
    }

    private void requireConversation(WorkspaceRow row) {
        if (!"APPROVED".equals(row.conversationStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The private conversation has not been provisioned yet.");
        }
    }

    private MentorshipWorkspaceSummary toSummary(WorkspaceRow row, long userId) {
        boolean mentor = row.mentorId() == userId;
        return new MentorshipWorkspaceSummary(
                row.conversationId(), row.conversationId(), row.subscriptionId(), row.requestId(),
                mentor ? row.menteeId() : row.mentorId(),
                mentor ? row.menteeName() : row.mentorName(),
                mentor ? "MENTOR" : "MENTEE",
                row.packageName(), row.subscriptionStatus(),
                row.currentPeriodStart(), row.currentPeriodEnd(),
                row.callsPerPeriod(), row.sessionDurationMinutes(),
                row.hasMonthly(), row.oneOffSessionCount(), row.upcomingSessionCount(), row.nextSessionAt(),
                repository.countUnread(row.conversationId(), userId));
    }

    private static MentorshipWorkspaceDetail toDetail(
            WorkspaceRow row, long userId, List<WorkspaceOneOffBookingDto> oneOffSessions,
            List<WorkspaceMessageDto> messages) {
        boolean mentor = row.mentorId() == userId;
        return new MentorshipWorkspaceDetail(
                row.conversationId(), row.conversationId(), row.subscriptionId(), row.requestId(),
                row.mentorId(), row.mentorName(), row.menteeId(), row.menteeName(),
                mentor ? row.menteeId() : row.mentorId(),
                mentor ? row.menteeName() : row.mentorName(),
                mentor ? "MENTOR" : "MENTEE",
                row.packageName(), row.subscriptionStatus(),
                row.currentPeriodStart(), row.currentPeriodEnd(),
                row.callsPerPeriod(), row.sessionDurationMinutes(),
                row.learningGoals(), row.hasMonthly(), oneOffSessions, messages);
    }

    private static WorkspaceOneOffBookingDto toOneOffBooking(OneOffBookingRow row) {
        return new WorkspaceOneOffBookingDto(
                row.id(), row.bookingCode(), row.serviceId(), row.sessionName(), row.agenda(),
                row.startAt(), row.endAt(), row.price(), row.currency(), row.status(), row.participants(),
                row.reviewId(), row.reviewRating(), row.reviewComment());
    }

    private static WorkspaceMessageDto toMessage(MessageRow row, long userId) {
        return new WorkspaceMessageDto(
                row.id(), row.senderId(), row.senderName(), row.messageType(),
                row.body(), row.codeLanguage(), row.sentAt(), row.senderId() == userId,
                row.fileId(), row.fileName(), row.fileMimeType(), row.fileSizeBytes());
    }

    private static String requiredClientKey(String value) {
        String key = trimToNull(value);
        if (key == null || key.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file upload key.");
        }
        return key;
    }

    private static String safeFileName(String value) {
        String name = value == null ? "attachment" : value.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "").trim();
        if (name.isEmpty()) name = "attachment";
        return name.length() > 255 ? name.substring(name.length() - 255) : name;
    }

    private static String sha256(byte[] content) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable.", exception);
        }
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private static long currentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user
                && user.id() != null) return user.id();
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                "Please log in to open your mentorship workspace.");
    }
}
