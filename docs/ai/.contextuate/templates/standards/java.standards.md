# Java Coding Standards

> **Language:** Java
> **Generated:** {DATE}

---

## Formatting

### Indentation
- **Style:** {Spaces}
- **Size:** {4} {spaces}

### Braces
- **Style:** K&R (same line) for classes and methods.

### Line Length
- **Max Length:** {100|120} chars

---

## Naming Conventions

### Classes/Interfaces
- **Style:** PascalCase
- **Example:** `UserManager`, `PaymentProcessor`

### Methods
- **Style:** camelCase
- **Example:** `calculateTotal()`, `findUserById()`

### Variables
- **Style:** camelCase
- **Example:** `firstName`, `orderCount`

### Constants (static final)
- **Style:** UPPER_SNAKE_CASE
- **Example:** `DEFAULT_TIMEOUT`, `MAX_USERS`

### Generics
- **Style:** Single capital letter
- **Example:** `E` (element), `T` (type), `K` (key), `V` (value)

---

## Structure

### File Organization
```java
// 1. Package declaration
package com.company.project.service;

// 2. Imports (sorted alphabetically, no wildcards)
import java.util.List;
import org.springframework.stereotype.Service;

// 3. Class definition
@Service
public class UserService {

    // 4. Constants
    private static final int MAX_AGE = 100;

    // 5. Fields
    private final UserRepository userRepository;

    // 6. Constructor
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // 7. Public methods
    public User getUser(Long id) {
        // ...
    }

    // 8. Private methods
    private void validate(User user) {
        // ...
    }
}
```

---

## Documentation (Javadoc)

### Required Elements
- **Classes:** Purpose of the class.
- **Public Methods:** Description, `@param`, `@return`, `@throws`.

```java
/**
 * Processes payment transactions.
 */
public class PaymentService {

    /**
     * Authorizes a transaction.
     *
     * @param amount The amount to authorize
     * @return true if successful
     * @throws PaymentException if connection fails
     */
    public boolean authorize(BigDecimal amount) throws PaymentException { ... }
}
```

---

## Error Handling

### Exceptions
- **Guideline:** Use unchecked exceptions (`RuntimeException`) for recoverable errors.
- **Guideline:** Avoid swallowing exceptions.

```java
// GOOD
try {
    file.read();
} catch (IOException e) {
    throw new UncheckedIOException("Failed to read config", e);
}

// BAD
catch (Exception e) {
    e.printStackTrace(); // Use a logger
}
```

---

## Common Patterns

### Optional
- **Guideline:** Use `Optional<T>` for return types that may be null.
- **Avoid:** Using `Optional` in parameters or fields.

```java
public Optional<User> findByEmail(String email) { ... }
```

### Streams API
- **Guideline:** Prefer Streams for collections processing.

```java
List<String> names = users.stream()
    .filter(User::isActive)
    .map(User::getName)
    .collect(Collectors.toList());
```

---

## Anti-Patterns

```java
// BAD: Public fields
public String name; // Use private + getter

// BAD: Magic numbers
if (status == 4) // Use constant STATUS_ACTIVE
```

---

*This file should be customized for your project. Replace placeholders with actual values.*
