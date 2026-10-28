package com.happyprogramming.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.OperationalSettings;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class OperationalSettingsRepository {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public OperationalSettingsRepository(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    public OperationalSettings read(){
        String value=jdbc.queryForObject("SELECT config_value FROM dbo.system_configs WHERE config_key='platform.operations'",String.class);
        try{return json.treeToValue(json.readTree(value).required("value"),OperationalSettings.class);}
        catch(Exception e){throw new IllegalStateException("Invalid operational configuration",e);}
    }
    public void lock(){jdbc.queryForList("SELECT config_key FROM dbo.system_configs WITH (UPDLOCK,HOLDLOCK) WHERE config_key='platform.operations'");}
    public void write(OperationalSettings settings,long actor){
        try{
            if(jdbc.update("UPDATE dbo.system_configs SET config_value=?,updated_by=?,updated_at=SYSUTCDATETIME() WHERE config_key='platform.operations'",json.writeValueAsString(java.util.Map.of("value",settings)),actor)!=1)
                throw new IllegalStateException("Operational configuration is missing");
        }catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Cannot store operational configuration",e);}
    }
}
