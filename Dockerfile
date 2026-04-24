# --- STAGE 1: Build Backend ---
FROM maven:3.8.5-openjdk-17-slim AS backend-build
WORKDIR /app/backend
COPY ./LawEZY-Backend/pom.xml .
COPY ./LawEZY-Backend/src ./src
RUN mvn clean package -DskipTests

# --- STAGE 2: Build Messenger ---
FROM node:18-slim AS messenger-build
WORKDIR /app/messenger
COPY ./LawEZY-Messenger/package*.json ./
RUN npm install
COPY ./LawEZY-Messenger/ .

# --- STAGE 3: Final Production Image ---
FROM node:18-slim
WORKDIR /app

# Install Java, Nginx, and Supervisor
RUN apt-get update && apt-get install -y \
    openjdk-17-jre-headless \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Copy built artifacts
COPY --from=backend-build /app/backend/target/*.jar /app/backend/app.jar
COPY --from=messenger-build /app/messenger /app/messenger
COPY LawEZY-Client/public/favicon.svg /app/favicon.svg

# Copy configurations
COPY nginx.conf /etc/nginx/sites-available/default
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set environment variables for ports
ENV PORT=8080
ENV MESSENGER_PORT=8081
ENV BACKEND_PORT=8082

# Expose Render's entry port
EXPOSE 8080

# Start Supervisor after fixing Nginx port
CMD ["/bin/sh", "-c", "sed -i \"s/listen 8080;/listen ${PORT:-8080};/g\" /etc/nginx/sites-available/default && /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf"]
