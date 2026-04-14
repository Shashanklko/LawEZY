# E-content Module

## Purpose
Responsible for handling electronic content distribution, such as articles, courses, or digital downloads within the application.

## Key Components
- **Entities (`entity/`)**: JPA relational mappings defining the structure of e-content, including metadata, descriptions, and file paths.
- **Repositories (`repository/`)**: Interfaces extending `JpaRepository` for data access.
- **Services (`service/`)**: Core logic for content categorization, searching, and business rules regarding content access/purchases.
- **Controllers (`controller/`)**: REST APIs exposing content catalogs to the frontend.

## Database
- **Primary Database**: MySQL
- Uses JPA (Hibernate) for structured metadata. (Note: Actual media or large course assets should be stored in an object store like AWS S3 or a CDN, with only URLs/metadata stored here).
