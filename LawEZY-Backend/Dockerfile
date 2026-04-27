# --- STAGE 1: Build Stage ---
FROM maven:3.8.4-openjdk-17-slim AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
# Build the application, skipping tests to speed up the process (Tests should be run during CI)
RUN mvn clean package -DskipTests

# --- STAGE 2: Run Stage ---
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
# Copy the built JAR from the previous stage
COPY --from=build /app/target/*.jar app.jar

# Standard Spring Boot port
EXPOSE 8080

# Run the project
# Using -Djava.security.egd=file:/dev/./urandom to speed up Tomcat startup
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
