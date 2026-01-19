# JavaScript/TypeScript Coding Standards

> **Language:** JavaScript / TypeScript
> **Generated:** {DATE}

---

## Formatting

### Indentation
- **Style:** {tabs|spaces}
- **Size:** {2|4} {spaces|tabs}

### Semicolons
- **Required:** {yes|no}

### Quotes
- **Strings:** {single|double|backticks for templates}

### Trailing Commas
- **Style:** {none|es5|all}

---

## Naming Conventions

### Classes/Components
- **Style:** PascalCase
- **Example:** `UserService`, `PaymentForm`

### Functions/Methods
- **Style:** camelCase
- **Example:** `getUserById()`, `handleSubmit()`

### Variables
- **Style:** camelCase
- **Example:** `userName`, `isActive`

### Constants
- **Style:** {UPPER_SNAKE_CASE|camelCase}
- **Example:** `MAX_RETRIES` or `maxRetries`

### Private Members
- **Style:** {underscore prefix|# prefix|none}
- **Example:** `_privateMethod()` or `#privateField`

### File Names
- **Style:** {kebab-case|camelCase|PascalCase}
- **Example:** `user-service.js` or `UserService.js`

---

## Structure

### Module Organization
```javascript
// 1. Imports - external
import React from 'react';
import axios from 'axios';

// 2. Imports - internal
import { UserService } from './services';
import { formatDate } from './utils';

// 3. Types/Interfaces (TypeScript)
interface User {
    id: number;
    name: string;
}

// 4. Constants
const API_URL = '/api/v1';

// 5. Main export
export class MyClass {
    // ...
}

// 6. Helper functions (if not exported separately)
function helperFunction() {
    // ...
}
```

### Function Length
- **Guideline:** {max lines per function}

---

## Variable Declarations

### Preferred Keywords
- **Immutable:** `const` (default)
- **Mutable:** `let`
- **Avoid:** `var`

```javascript
// GOOD
const user = getUser();
let count = 0;

// BAD
var user = getUser();
```

---

## Functions

### Declaration Style
```javascript
// Preferred: {function declaration|arrow function|mixed}

// Function declaration
function processData( data ) {
    // ...
}

// Arrow function
const processData = ( data ) => {
    // ...
};
```

### Parameters
```javascript
// Destructuring: {preferred|optional}
function createUser( { name, email, role = 'user' } ) {
    // ...
}

// Default values
function greet( name = 'Guest' ) {
    // ...
}
```

---

## Async/Await

### Preferred Style
```javascript
// {async/await|promises|callbacks for specific cases}

// GOOD
async function fetchUser( id ) {
    try {
        const response = await api.get( `/users/${id}` );
        return response.data;
    } catch( error ) {
        handleError( error );
    }
}

// AVOID (unless necessary)
function fetchUser( id ) {
    return api.get( `/users/${id}` )
        .then( response => response.data )
        .catch( handleError );
}
```

---

## TypeScript Specific

### Type Annotations
```typescript
// {Required|Inferred where possible}

// Explicit
function getUser( id: number ): Promise<User> {
    // ...
}

// Inferred (if allowed)
const count = 0; // inferred as number
```

### Interfaces vs Types
```typescript
// Preferred for objects: {interface|type}
interface User {
    id: number;
    name: string;
}

// Use type for: unions, primitives, tuples
type Status = 'active' | 'inactive';
```

### Strict Mode
- **Enabled:** {yes|no}
- **Null checks:** {strict|relaxed}

---

## Error Handling

### Try/Catch
```javascript
try {
    await riskyOperation();
} catch( error ) {
    if( error instanceof SpecificError ){
        // handle specific
    } else {
        // handle general
    }
}
```

### Error Types
```typescript
// Custom errors: {yes|no}
class ValidationError extends Error {
    constructor( message: string, public field: string ){
        super( message );
        this.name = 'ValidationError';
    }
}
```

---

## Imports/Exports

### Module Style
```javascript
// Named exports (preferred for utilities)
export function helper() {}
export const CONSTANT = 'value';

// Default export (for main class/component)
export default class MainService {}
```

### Import Organization
```javascript
// 1. External packages
// 2. Internal absolute paths
// 3. Internal relative paths
// 4. Styles/assets
```

---

## Common Patterns

### Null/Undefined Handling
```javascript
// Optional chaining
const city = user?.address?.city;

// Nullish coalescing
const name = user.name ?? 'Anonymous';

// Default parameters
function greet( name = 'Guest' ) {}
```

### Object Manipulation
```javascript
// Spread for copies
const updated = { ...user, name: 'New Name' };

// Destructuring
const { id, name } = user;
```

---

## Anti-Patterns

```javascript
// BAD: {description}
{bad example}

// GOOD: {description}
{good example}
```

---

## Framework-Specific

{Add any React/Vue/Node/etc. specific conventions here}

---

*This file should be customized for your project. Replace placeholders with actual values.*
