package com.happyprogramming.controller;

import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.happyprogramming.dto.ApiResponse;
import com.happyprogramming.dto.MentorCard;
import com.happyprogramming.service.MentorCatalog;

@RestController
@RequestMapping("/api/mentors")
@CrossOrigin(origins = "*")
public class MentorController {
    private final MentorCatalog mentorCatalog;

    public MentorController(MentorCatalog mentorCatalog) {
        this.mentorCatalog = mentorCatalog;
    }

    @GetMapping
    public ApiResponse<List<MentorCard>> searchMentors(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(required = false) List<String> skills,
            @RequestParam(required = false) List<String> jobTitles,
            @RequestParam(required = false) List<String> companies,
            @RequestParam(required = false) List<String> languages,
            @RequestParam(required = false) List<String> countries,
            @RequestParam(required = false) Integer minExperience,
            @RequestParam(required = false) Long minPrice,
            @RequestParam(required = false) Long maxPrice,
            @RequestParam(required = false) Double minRating,
            @RequestParam(required = false) Boolean available,
            @RequestParam(defaultValue = "recommended") String sort) {
        return ApiResponse.ok(mentorCatalog.search(q, skills, jobTitles, companies, languages, countries,
                minExperience, minPrice, maxPrice, minRating, available, sort));
    }
}
