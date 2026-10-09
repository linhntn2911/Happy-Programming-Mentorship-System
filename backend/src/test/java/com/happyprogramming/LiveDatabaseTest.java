package com.happyprogramming;

import com.happyprogramming.dto.AdminDtos;
import com.happyprogramming.repository.AdminRepository;
import com.happyprogramming.service.AdminService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import javax.sql.DataSource;
import static org.junit.jupiter.api.Assertions.*;

/** Explicit opt-in: runs Flyway and requires a disposable canonical SQL Server database. */
@SpringBootTest
@EnabledIfEnvironmentVariable(named="HPMS_TEST_SQLSERVER", matches="true")
class LiveDatabaseTest {
    @Autowired DataSource dataSource;
    @Test void canonicalDatabaseAndMigrationAreAvailable() throws Exception {
        try (var connection = dataSource.getConnection(); var statement = connection.createStatement()) {
            try (var rs = statement.executeQuery("SELECT COUNT(*) FROM dbo.skill_categories")) {
                assertTrue(rs.next()); assertEquals(4, rs.getInt(1));
            }
            try (var rs = statement.executeQuery("SELECT COL_LENGTH('dbo.audit_logs','ip_address'), OBJECT_ID('dbo.trg_audit_logs_immutable','TR')")) {
                assertTrue(rs.next()); assertEquals(45, rs.getInt(1)); assertNotNull(rs.getObject(2));
            }
        }
    }
}
