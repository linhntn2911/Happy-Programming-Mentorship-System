package com.happyprogramming.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.PublicSupportConfig;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicConfigService {
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public PublicConfigService(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public PublicSupportConfig support() {
        List<String> values = jdbc.queryForList(
                "SELECT config_value FROM dbo.system_configs WHERE config_key = 'platform.support_email'",
                String.class);
        if (values.isEmpty()) return new PublicSupportConfig("");
        try {
            var value = json.readTree(values.get(0)).get("value");
            String email = value == null || value.isNull() ? "" : value.asText().trim();
            return new PublicSupportConfig(EMAIL.matcher(email).matches() ? email : "");
        } catch (Exception ignored) {
            return new PublicSupportConfig("");
        }
    }
}
