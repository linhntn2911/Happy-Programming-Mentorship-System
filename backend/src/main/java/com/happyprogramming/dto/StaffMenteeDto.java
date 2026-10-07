package com.happyprogramming.dto;

public class StaffMenteeDto {
    private String id;
    private String name;
    private String email;
    private String registeredDate;
    private int requestsCount;
    private String status;
    private boolean emailVerified;

    public StaffMenteeDto() {}

    public StaffMenteeDto(String id, String name, String email, String registeredDate, int requestsCount, String status, boolean emailVerified) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.registeredDate = registeredDate;
        this.requestsCount = requestsCount;
        this.status = status;
        this.emailVerified = emailVerified;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getRegisteredDate() { return registeredDate; }
    public void setRegisteredDate(String registeredDate) { this.registeredDate = registeredDate; }

    public int getRequestsCount() { return requestsCount; }
    public void setRequestsCount(int requestsCount) { this.requestsCount = requestsCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
}
