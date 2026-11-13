# Stage 1: Build Spring Boot Application
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /app

# Copy docs (antrun plugin copies SQL migrations from ../docs/database/migration)
COPY docs ./docs
COPY backend ./backend

WORKDIR /app/backend
RUN mvn clean package -DskipTests

# Stage 2: Runtime image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy compiled jar
COPY --from=builder /app/backend/target/*.jar app.jar

EXPOSE 8080
ENV PORT=8080

# Limit JVM memory for 512MB Free Tier (Prevent OOM on Render)
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-Xmx350m", "-Xms150m", "-jar", "app.jar"]

