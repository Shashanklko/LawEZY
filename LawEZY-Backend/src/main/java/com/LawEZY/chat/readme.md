# Chat Module

## Purpose
Provides real-time messaging capabilities for users, supporting single or group chat rooms via bidirectional communication with high throughput.

## Key Components
- **Models (`model/`)**: MongoDB document mappings for representing chat conversations, individual messages, and unread states.
- **Repositories (`repository/`)**: Interfaces extending `MongoRepository` for high-volume messaging data access.
- **Services (`service/`)**: Business logic managing message delivery, online presence mapping, and chat history retrieval.
- **Controllers (`controller/`)**: Both REST APIs (for fetching history) and WebSocket handlers (for active real-time message streams).
- **DTOs (`dto/`)**: Structures for real-time payload broadcasting over web sockets.

## Database & Technologies
- **Primary Database**: MongoDB (chosen for its schemaless, document-oriented structure which is heavily suited for high-volume, variable unstructured message logging).
- **Real-time Protocol**: WebSockets (STOMP / SockJS generally used in Spring Boot).
