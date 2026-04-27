# --- STAGE 1: Build Backend ---
FROM maven:3.8.5-openjdk-17-slim AS backend-build
WORKDIR /app
COPY ./LawEZY-Backend/pom.xml .
COPY ./LawEZY-Backend/src ./src
RUN mvn clean package -DskipTests

# --- STAGE 2: Final Production Image ---
FROM openjdk:17-slim
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=backend-build /app/target/*.jar app.jar

# Set environment variables
ENV PORT=8080

# Expose Render's entry port
EXPOSE 8080

# Run the Spring Boot application natively
CMD java -Xmx512m -Djava.security.egd=file:/dev/./urandom -jar app.jar --server.port=${PORT} --server.address=0.0.0.0
