package com.happyprogramming.dto;

import java.util.List;

public record MentorDashboardResponse(
        MentorDashboardSummary summary,
        List<MentorDashboardRequest> incomingRequests,
        List<MentorSystemNotice> systemNotices) {
}
