# Config Module

## Purpose
Contains the core configuration classes for the application. It helps separate the application bootstrapping and configurations from the main business logic.

## Key Components
- **Database Configuration (`database/`)**: Setup for MySQL and MongoDB connections, including JPA/Hibernate and MongoTemplate setups.
- **Security (`security/`)**: Spring Security configuration, defining authentication rules, CORS, and password encoders.
- **WebSocket (`websocket/`)**: Configuration for real-time bidirectional communication used by the chat module.

## Technologies Used
- Spring Boot Auto-configuration
- Spring Security
- Spring WebSockets
