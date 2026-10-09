package com.happyprogramming.dto;

import java.util.List;

public class StaffDashboardDto {
    private long pendingApplicationsCount;
    private long activeMentorsCount;
    private long activeMenteesCount;
    private long pendingRequestsCount;
    private List<StaffActivityDto> recentActivities;

    public StaffDashboardDto() {}

    public StaffDashboardDto(long pendingApplicationsCount, long activeMentorsCount, long activeMenteesCount, long pendingRequestsCount, List<StaffActivityDto> recentActivities) {
        this.pendingApplicationsCount = pendingApplicationsCount;
        this.activeMentorsCount = activeMentorsCount;
        this.activeMenteesCount = activeMenteesCount;
        this.pendingRequestsCount = pendingRequestsCount;
        this.recentActivities = recentActivities;
    }

    public long getPendingApplicationsCount() {
        return pendingApplicationsCount;
    }

    public void setPendingApplicationsCount(long pendingApplicationsCount) {
        this.pendingApplicationsCount = pendingApplicationsCount;
    }

    public long getActiveMentorsCount() {
        return activeMentorsCount;
    }

    public void setActiveMentorsCount(long activeMentorsCount) {
        this.activeMentorsCount = activeMentorsCount;
    }

    public long getActiveMenteesCount() {
        return activeMenteesCount;
    }

    public void setActiveMenteesCount(long activeMenteesCount) {
        this.activeMenteesCount = activeMenteesCount;
    }

    public long getPendingRequestsCount() {
        return pendingRequestsCount;
    }

    public void setPendingRequestsCount(long pendingRequestsCount) {
        this.pendingRequestsCount = pendingRequestsCount;
    }

    public List<StaffActivityDto> getRecentActivities() {
        return recentActivities;
    }

    public void setRecentActivities(List<StaffActivityDto> recentActivities) {
        this.recentActivities = recentActivities;
    }
}
