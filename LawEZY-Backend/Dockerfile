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

# Render expects port 10000 by default; override via SERVER_PORT env var
ENV SERVER_PORT=10000
EXPOSE ${SERVER_PORT}

# Run the project with container-optimized JVM flags
ENTRYPOINT ["java", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-jar", "app.jar"]
