package com.happyprogramming.role.mentee;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
@Entity
@Table(name="files",schema="dbo")
public class ProfileAvatar {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="uploaded_by") private Long owner;
    @Column(name="original_name") private String originalName;
    @Column(name="storage_key") private String storageKey;
    @Column(name="mime_type") private String mimeType;
    @Column(name="size_bytes") private long sizeBytes;
    private String visibility;
    private String status;
    @Column(name="created_at") private LocalDateTime createdAt;
    @Column(name="updated_at") private LocalDateTime updatedAt;
    @Column(name="avatar_content",columnDefinition="varbinary(max)") private byte[] content;
    protected ProfileAvatar() {}
    public ProfileAvatar(Long owner, byte[] content, LocalDateTime now) {
        this.owner=owner; this.content=content; sizeBytes=content.length;
        originalName="avatar.png"; storageKey="profile-avatar/"+UUID.randomUUID(); mimeType="image/png";
        visibility="PRIVATE"; status="READY"; createdAt=now; updatedAt=now;
    }
    public Long getId() { return id; }
    public byte[] getContent() { return content; }
    public boolean belongsTo(Long user) { return user.equals(owner) && storageKey.startsWith("profile-avatar/"); }
    public boolean ready() { return "READY".equals(status) && content!=null; }
    public void retire(LocalDateTime now) { content=null; status="DELETED"; updatedAt=now; }
}
