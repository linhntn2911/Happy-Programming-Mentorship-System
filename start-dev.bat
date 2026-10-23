@echo off
cd /d "%~dp0"

echo Dang khoi dong Frontend tai cong 5173...
start "Frontend-Vite" cmd /k "cd frontend && npm run dev"

echo Dang khoi dong Backend tai cong 8080...
start "Backend-SpringBoot" cmd /k "cd backend && mvnw.cmd spring-boot:run"

echo Dang doi 5 giay de cac dich vu khoi dong...
timeout /t 5 >nul

start http://localhost:5173
