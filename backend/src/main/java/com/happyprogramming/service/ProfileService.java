package com.happyprogramming.service;

import com.happyprogramming.dto.ProfileDtos;
import com.happyprogramming.entity.ProfileAvatar;
import com.happyprogramming.entity.User;
import com.happyprogramming.repository.ProfileAvatarRepository;
import com.happyprogramming.repository.UserRepository;

import com.happyprogramming.dto.ProfileDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.net.URI;
import java.util.Base64;
import java.io.*;
import javax.imageio.ImageIO;
@Service
public class ProfileService {
    private final UserRepository users;
    private final ProfileAvatarRepository avatars;
    private final Clock clock;
    public ProfileService(UserRepository users, ProfileAvatarRepository avatars, Clock clock) { this.users=users; this.avatars=avatars; this.clock=clock; }
    private User require(Long id, boolean lock) {
        if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Please log in to edit your profile.");
        User u=(lock ? users.findForLoginById(id) : users.findById(id)).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Account unavailable."));
        if(!"ACTIVE".equals(u.getStatus()) || !u.hasRole("MENTEE")) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Only active mentees can edit this profile.");
        return u;
    }
    private Profile dto(User u) {
        String first=u.getFirstName(), last=u.getLastName();
        if((first==null || first.isBlank()) && (last==null || last.isBlank())) {
            String[] parts=u.getFullName().strip().split("\\s+",2); first=parts[0]; last=parts.length>1 ? parts[1] : "";
        }
        return new Profile(first,last,u.getEmail(),u.getBio(),u.getExperienceLevel(),u.getLearningGoals(),u.getGithubUrl(),u.getPortfolioUrl(),u.getAvatarFileId()!=null); }
    @Transactional(readOnly=true) public Profile get(Long id) { return dto(require(id,false)); }
    @Transactional public Profile update(Long id, Update body) {
        User u=require(id,true);
        String first=body.firstName().strip(), last=body.lastName().strip();
        if(first.isEmpty() || last.isEmpty() || (first+" "+last).length()>150) throw bad("Please enter a valid first and last name (150 characters combined).");
        String github=url(body.githubUrl(),true), portfolio=url(body.portfolioUrl(),false);
        u.updateProfile(first,last,clean(body.bio()),clean(body.experienceLevel()),clean(body.learningGoals()),github,portfolio,LocalDateTime.now(clock));
        users.save(u); return dto(u);
    }
    private static String clean(String s) { return s==null || s.isBlank() ? null : s.strip(); }
    static String url(String raw, boolean github) {
        String value=clean(raw); if(value==null) return null;
        try { URI uri=URI.create(value);
            if(!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost()==null || uri.getUserInfo()!=null || (github && !"github.com".equalsIgnoreCase(uri.getHost()))) throw new IllegalArgumentException();
            return value;
        } catch(IllegalArgumentException e) { throw bad(github ? "Use an HTTPS link on github.com." : "Use a valid HTTPS portfolio URL."); }
    }
    @Transactional(readOnly=true) public byte[] avatar(Long id) {
        User u=require(id,false);
        if(u.getAvatarFileId()==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"No avatar uploaded.");
        return avatars.findById(u.getAvatarFileId()).filter(a -> a.belongsTo(id) && a.ready()).map(ProfileAvatar::getContent)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Avatar unavailable."));
    }
    @Transactional public Profile upload(Long id, String base64) {
        User u=require(id,true); byte[] image=normalizeImage(base64);
        retire(u); ProfileAvatar avatar=avatars.save(new ProfileAvatar(id,image,LocalDateTime.now(clock)));
        u.setAvatarFileId(avatar.getId(),LocalDateTime.now(clock)); users.save(u); return dto(u);
    }
    @Transactional public Profile removeAvatar(Long id) {
        User u=require(id,true); retire(u); u.setAvatarFileId(null,LocalDateTime.now(clock)); users.save(u); return dto(u);
    }
    private void retire(User u) {
        if(u.getAvatarFileId()!=null) avatars.findById(u.getAvatarFileId()).filter(a -> a.belongsTo(u.getId())).ifPresent(a -> a.retire(LocalDateTime.now(clock)));
    }
    static byte[] normalizeImage(String base64) {
        try {
            byte[] bytes=Base64.getDecoder().decode(base64);
            if(bytes.length==0 || bytes.length>2*1024*1024) throw bad("Avatar must be at most 2 MB.");
            try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers=ImageIO.getImageReaders(input);
                if(!readers.hasNext()) throw bad("Choose a valid PNG or JPEG image.");
                var reader=readers.next();
                try {
                    reader.setInput(input); String format=reader.getFormatName();
                    if(!format.equalsIgnoreCase("PNG") && !format.equalsIgnoreCase("JPEG")) throw bad("Choose a PNG or JPEG image.");
                    if(reader.getWidth(0)>2048 || reader.getHeight(0)>2048) throw bad("Avatar dimensions must not exceed 2048 x 2048 pixels.");
                    var image=reader.read(0); var output=new ByteArrayOutputStream(); ImageIO.write(image,"png",output);
                    if(output.size()>2*1024*1024) throw bad("Choose a smaller image (normalized avatar exceeds 2 MB).");
                    return output.toByteArray();
                } finally { reader.dispose(); }
            }
        } catch(IOException | IllegalArgumentException e) { throw bad("Choose a valid PNG or JPEG image."); }
    }
    private static ResponseStatusException bad(String text) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,text); }
}
