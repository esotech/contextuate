# PHP Coding Standards

> **Language:** PHP
> **Generated:** {DATE}

---

## Formatting

### Indentation
- **Style:** {tabs|spaces}
- **Size:** {2|4} {spaces|tabs}

### Braces
- **Classes/Functions:** {same-line|next-line}
- **Control structures:** {same-line|next-line}

### Spacing
- **Inside parentheses:** {yes|no} - `function( $param )` vs `function($param)`
- **After keywords:** {yes|no} - `if ( $x )` vs `if($x)`
- **Array brackets:** {no-spaces} - `$arr['key']`

---

## Naming Conventions

### Classes
- **Style:** PascalCase
- **Example:** `UserService`, `PaymentController`

### Methods
- **Style:** camelCase
- **Example:** `getUserById()`, `processPayment()`

### Variables
- **Style:** {camelCase|snake_case}
- **Example:** `$userName` or `$user_name`

### Constants
- **Style:** UPPER_SNAKE_CASE
- **Example:** `MAX_RETRY_COUNT`, `API_VERSION`

### Properties
- **Style:** {camelCase|snake_case}
- **Visibility prefix:** {none|underscore for private}

---

## Structure

### File Organization
```php
<?php
// 1. Strict types declaration (if used)
declare( strict_types=1 );

// 2. Namespace
namespace App\Services;

// 3. Use statements (alphabetized)
use App\Models\User;
use Exception;

// 4. Class definition
class UserService {
    // 5. Constants
    // 6. Properties
    // 7. Constructor
    // 8. Public methods
    // 9. Protected methods
    // 10. Private methods
}
```

### Method Length
- **Guideline:** {max lines per method}
- **Complexity:** {max cyclomatic complexity}

---

## Type Hints

### Parameters
```php
// {Required|Optional}
public function process( string $name, int $count ): void
```

### Return Types
```php
// {Required|Optional}
public function getData(): array
```

### Property Types (PHP 7.4+)
```php
// {Required|Optional}
private string $name;
private User|null $user = null;
```

---

## Documentation

### Class DocBlocks
```php
/**
 * {Required|Optional}
 * Brief description of the class.
 */
class MyClass
```

### Method DocBlocks
```php
/**
 * {Required|Optional|Only for complex methods}
 *
 * @param string $name Description
 * @return array Description
 * @throws Exception When condition
 */
```

---

## Error Handling

### Exceptions
- **Custom exceptions:** {yes|no}
- **Base exception class:** {name if applicable}

### Try/Catch
```php
try {
    // code
} catch( SpecificException $e ){
    // handle
} catch( Exception $e ){
    // fallback
}
```

---

## Common Patterns

### Dependency Injection
```php
// {Constructor injection|Setter injection|Container}
public function __construct( private UserRepository $repo )
```

### Null Handling
```php
// Preferred: {null coalescing|ternary|early return}
$value = $data['key'] ?? 'default';
```

---

## Anti-Patterns

```php
// BAD: {description}
{bad example}

// GOOD: {description}
{good example}
```

---

## Framework-Specific

{Add any framework-specific conventions here}

---

*This file should be customized for your project. Replace placeholders with actual values.*
