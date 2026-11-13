@echo off
set "JAVA_HOME=C:\Users\trkho\.jdks\ms-17.0.19"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "d:\Happy-Programming-Mentorship-System\backend"
call mvnw.cmd spring-boot:run
