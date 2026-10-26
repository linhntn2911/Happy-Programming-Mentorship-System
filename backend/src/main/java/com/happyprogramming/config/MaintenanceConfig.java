package com.happyprogramming.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.happyprogramming.dto.*;
import com.happyprogramming.service.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;
import jakarta.servlet.http.*;

@Configuration
public class MaintenanceConfig implements WebMvcConfigurer {
    private final ObjectProvider<OperationalSettingsService> operations;
    private final ObjectProvider<AdminService> admins;
    private final ObjectMapper json;
    public MaintenanceConfig(ObjectProvider<OperationalSettingsService> operations,ObjectProvider<AdminService> admins,ObjectMapper json){this.operations=operations;this.admins=admins;this.json=json;}
    public void addInterceptors(InterceptorRegistry registry){registry.addInterceptor(interceptor()).addPathPatterns("/api/**").order(-100);}
    HandlerInterceptor interceptor(){ return new HandlerInterceptor(){
        public boolean preHandle(HttpServletRequest req,HttpServletResponse res,Object handler)throws Exception{
            var service=operations.getIfAvailable();if(service==null)return true;
            String path=req.getRequestURI().substring(req.getContextPath().length());
            if(java.util.Set.of("/api/auth/login","/api/auth/logout","/api/auth/csrf","/api/auth/me","/api/auth/options","/api/auth/forgot-password","/api/auth/reset-password","/api/public/operations").contains(path)
                || (path.equals("/api/payments/sepay/webhook") && req.getMethod().equals("POST")))return true;
            if(!service.read().maintenance())return true;
            if(req.getUserPrincipal() instanceof Authentication auth&&auth.getPrincipal() instanceof AuthenticatedUser user){
                try{admins.getObject().requireAdmin(user.email());return true;}
                catch(org.springframework.web.server.ResponseStatusException ignored){ }
            }
            res.setStatus(503);res.setHeader("Retry-After","60");res.setContentType("application/json");
            json.writeValue(res.getOutputStream(),ApiResponse.error("The system is under maintenance. Please try again later."));return false;
        }
    };}
}
