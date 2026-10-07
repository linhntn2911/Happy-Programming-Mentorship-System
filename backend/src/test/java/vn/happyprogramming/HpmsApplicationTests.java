package vn.happyprogramming;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class HpmsApplicationTests {

    @Autowired
    private DataSource dataSource;

    @Test
    void contextLoads() {
    }

    @Test
    @EnabledIfSystemProperty(named = "hpms.database.integration", matches = "true")
    void testLiveDatabaseConnection() throws Exception {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet rs = statement.executeQuery("SELECT COUNT(*) AS total FROM dbo.skill_categories")) {
            assertTrue(rs.next());
            int total = rs.getInt("total");
            System.out.println(">>> LIVE DATABASE QUERY RESULT: skill_categories count = " + total);
            assertEquals(4, total);
        }
    }
}
