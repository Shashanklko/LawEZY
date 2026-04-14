# User Module

## Purpose
Manages user profiles, roles, permissions, and overall account-related operations. It serves as the primary source of truth for user data.

## Key Components
- **Entities (`entity/`)**: JPA entities representing the standard user relational schema.
- **Repositories (`repository/`)**: Interfaces extending `JpaRepository` for MySQL database interactions.
- **Services (`service/`)**: Business logic pertaining to user CRUD operations, profile updates, and role validations.
- **Controllers (`controller/`)**: REST API endpoints for user metadata management.

## Database
- **Primary Database**: MySQL
- Uses JPA (Hibernate) for Object-Relational Mapping to store profiles, roles, and status securely.

---

## 📚 Study Guide: The 4 Layers & Keywords Explained

In this module, we built a standard 4-layer Spring Boot architecture. Here is exactly how it works and what the magic keywords mean:

### 1. The Entity Layer (`User.java`)
**Purpose:** Defines the *blueprint* for what a table looks like in the MySQL database.
*   `@Entity`: Tells Spring "This class represents a database table."
*   `@Id`: Tells Spring "This field is the Primary Key."
*   `@GeneratedValue`: Tells Spring "Auto-increment this ID for me (1, 2, 3...) so I don't have to."
*   `@Data` (Lombok): Automatically generates getters, setters, and constructors invisibly, keeping our code clean.

### 2. The Repository Layer (`UserRepository.java`)
**Purpose:** Handles all communication with the database (Saving, Deleting, Finding) without us writing SQL.
*   `@Repository`: Tells Spring "This interface handles database operations."
*   `extends JpaRepository`: This is a built-in Spring tool that gives us 50+ free database methods instantly (like `.save()`, `.findAll()`, etc.).

### 3. The Service Layer (`UserService.java` & `UserServiceImp.java`)
**Purpose:** The "Brain" of the application. It holds the business logic (e.g., "Check if this email is valid before saving"). It tells the Repository what to do.
*   `@Service`: Tells Spring "This class contains my business rules, please load it into memory."
*   `@Autowired`: Tells Spring "Please automatically find my Repository and inject it here so I can use its methods." We do this so we don't have to write `new UserRepository()`.

### 4. The Controller Layer (`UserController.java`)
**Purpose:** The "Receptionist". It opens the door to the outside world (like your frontend). It catches HTTP requests, passes the data to the Service layer, and sends an HTTP Response back out.
*   `@RestController`: Tells Spring "This class listens for web requests and responds with JSON data."
*   `@RequestMapping`: Sets a base URL path (e.g., `/api/users`) for all methods inside the Controller.
*   `@GetMapping / @PostMapping / @PutMapping / @DeleteMapping`: Maps specific HTTP actions to specific Java methods.
*   `@PathVariable`: Extracts a dynamic value directly from the URL (like capturing the '5' out of `/api/users/5`).
*   `@RequestBody`: Takes the raw JSON payload the frontend sent, and automatically converts it into a usable Java Object (like a `User`).
*   `ResponseEntity<>`: The wrapper we use to send data back. It allows us to manually set HTTP Status Codes (like `200 OK`, `201 CREATED`, or `204 NO CONTENT`) so the frontend knows exactly what happened.
