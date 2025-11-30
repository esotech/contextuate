# Go Coding Standards

> **Language:** Go
> **Generated:** {DATE}

---

## Formatting

### Tooling
- **Required:** `gofmt` (or `goimports`) must be applied to all files.

### Indentation
- **Style:** Tabs (Standard Go behavior)

### Line Length
- **Guideline:** No strict limit, but prefer readability (80-120 chars).

---

## Naming Conventions

### General Rule
- Use `MixedCaps` or `mixedCaps` (CamelCase).
- Keep names short and concise.

### Packages
- **Style:** lowercase, single word
- **Avoid:** snake_case, camelCase in package names
- **Example:** `package user`, not `package user_service`

### Interfaces
- **Style:** Method name + "er" (if single method)
- **Example:** `Reader`, `Writer`, `Formatter`

### Structs/Interfaces
- **Exported:** PascalCase (`User`)
- **Unexported:** camelCase (`userHelper`)

### Functions/Methods
- **Exported:** PascalCase (`GetUser`)
- **Unexported:** camelCase (`parseData`)

### Constants
- **Style:** PascalCase (for exported) or camelCase
- **Avoid:** UPPER_SNAKE_CASE (unlike other languages)
- **Example:** `MaxRetries`, not `MAX_RETRIES`

---

## Structure

### File Organization
```go
package main

// 1. Imports (grouped: stdlib, third-party, local)
import (
    "fmt"
    "os"

    "github.com/pkg/errors"

    "myproject/internal/user"
)

// 2. Constants
const DefaultTimeout = 30

// 3. Types (Structs/Interfaces)
type Service interface {
    Do() error
}

// 4. Factory Functions
func NewService() Service {
    return &serviceImpl{}
}

// 5. Methods
func (s *serviceImpl) Do() error {
    return nil
}
```

---

## Error Handling

### Pattern
- **Style:** Check errors immediately. Avoid nesting.

```go
// GOOD
f, err := os.Open("file.txt")
if err != nil {
    return err
}

// BAD
if f, err := os.Open("file.txt"); err == nil {
    // ...
}
```

### Wrapping
- **Guideline:** Wrap errors with context when passing up the stack.
- **Example:** `fmt.Errorf("failed to open config: %w", err)`

---

## Documentation

### Comments
- **Exported identifiers:** MUST have a doc comment starting with the name.
- **Format:** Complete sentences.

```go
// User represents a system user.
type User struct { ... }

// Fetch retrieves the user by ID.
func (u *User) Fetch(id int) error { ... }
```

---

## Common Patterns

### Options Pattern
```go
// Preferred for complex constructors
type Option func(*Server)

func WithPort(port int) Option {
    return func(s *Server) { s.port = port }
}

func NewServer(opts ...Option) *Server { ... }
```

### Context
- **Guideline:** Pass `context.Context` as the first argument to functions performing I/O.

```go
func (s *Service) GetData(ctx context.Context, id string) error { ... }
```

---

## Anti-Patterns

```go
// BAD: Panic in libraries
func Parse() {
    if err != nil {
        panic(err) // Return error instead
    }
}

// BAD: Global state
var db *sql.DB // Use dependency injection
```

---

*This file should be customized for your project. Replace placeholders with actual values.*
