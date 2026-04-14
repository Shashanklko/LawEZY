# Authentication Module (Auth)

## Purpose
Handles user authentication and authorization logic, ensuring that incoming requests are securely verified before accessing protected resources.

## Key Components
- **Controllers (`controller/`)**: Exposes login and registration endpoints.
- **Services (`service/`)**: Contains the core logic to verify user credentials and issue tokens.
- **DTOs (`dto/`)**: Data Transfer Objects used for login requests and auth responses.
- **Utilities (`util/`)**: Helper classes mainly focused on generating, parsing, and validating JWT (JSON Web Tokens).

## Technologies & Database
- **Primary Process**: Auth flow validates against the MySQL database via the User module.
- **Tokens**: JWT (JSON Web Tokens)
- **Security**: Spring Security
