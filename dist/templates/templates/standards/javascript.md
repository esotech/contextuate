# JavaScript Standards (Esotech / TLDCRM House Style)

> **Language:** JavaScript
> **Intent:** These are Esotech defaults. Be consistent; do not “improve” formatting per-file.

---

## Non‑Negotiables

- **Indentation:** Tabs (display width 4)
- **Spaces inside parentheses:** `fn( arg )`, `if ( cond )`
- **Spaces inside brackets for single-line arrays:** `[ 'a', 'b' ]`
- **Spaces around operators:** `a + b`, `x = y`
- Prefer **async/await** over promise chains (unless chaining materially improves clarity)

---

## Formatting

### Indentation & Spacing
- **Indentation:** Tabs (4-space width)
- **Spacing:** Spaces inside parentheses
  - ✅ `function myFunction( param )`
  - ❌ `function myFunction(param)`
- **Operators:** Spaces around operators: `let sum = a + b;`

### Arrays
```javascript
// Single-line: spaces inside brackets
const items = [ 'item1', 'item2' ];

// Multi-line: each item on own line
const items = [
    'item1',
    'item2',
    'item3',
];
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `LeadManager` |
| Functions | camelCase | `processLead()` |
| Variables | camelCase | `leadData` |
| Private | _prefixed | `_privateMethod()` |
| Constants | UPPER_SNAKE | `const MAX_USERS = 100;` |

---

## Async

### Async/Await (default)
```javascript
// Prefer async/await over promise chains
async function fetchData() {
    try {
        const data = await fetch( 'https://example.com/api' );
        return await data.json();
    } catch ( error ) {
        console.error( error );
        throw error;
    }
}
```

### Promise Chaining (when needed)
```javascript
myPromiseFunction()
    .then( result => {
        // handle success
    })
    .catch( error => {
        // handle error
    });
```

---

## TODO (Refinement Targets)

- Imports ordering (external → internal → relative)
- File naming conventions
- Error-handling policy (throw vs return sentinel)
- Tooling: whether this style is enforced by Prettier/ESLint config in each repo
