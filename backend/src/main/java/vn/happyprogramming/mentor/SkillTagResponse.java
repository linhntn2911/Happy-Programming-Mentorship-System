package vn.happyprogramming.mentor;

public record SkillTagResponse(
        Long id,
        Long categoryId,
        String name,
        String slug,
        String description
) {
}
