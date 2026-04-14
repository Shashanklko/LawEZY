# Common Module

## Purpose
A shared utility layer containing logic, base classes, and configurations that are universally required across multiple domain-specific modules. It helps keep code DRY (Don't Repeat Yourself) without forming circular dependencies.

## Key Components
- **Exceptions (`exception/`)**: Global exception handling, custom exception definitions, and `@ControllerAdvice` for unified error responses across all APIs.
- **Responses (`response/`)**: Standardized Wrapper classes (e.g., `ApiResponse`, `PaginatedResponse`) to ensure all REST APIs follow a uniform predictable JSON output structure.
- **Constants (`constants/`)**: Fixed application-wide properties and enumerations (e.g., standard error codes, pagination defaults, role definitions).

## Database
- **Primary Database**: None. 
- Conceptually framework-agnostic utilities; does not interact directly with MySQL or MongoDB.
