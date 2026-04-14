# Blog / Community Module

## Purpose
Powers the content and community discussion features, allowing users to create, read, update, and delete blog posts, comments, and interactions.

## Key Components
- **Entities (`entity/`)**: JPA entities representing blog posts, comments, tags, and category relations.
- **Repositories (`repository/`)**: `JpaRepository` interfaces for MySQL database operations.
- **Services (`service/`)**: Business logic handling the creation of posts, publishing workflows, and moderation.
- **Controllers (`controller/`)**: REST APIs for fetching blog feeds and interacting with community posts.

## Database
- **Primary Database**: MySQL
- Uses JPA (Hibernate) for storing structured post content, timestamps, authors (linked to `user` module), and relational metrics like likes and views.
