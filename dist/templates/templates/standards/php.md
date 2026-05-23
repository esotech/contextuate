# PHP Standards (Esotech / TLDCRM House Style)

> **Language:** PHP
> **Intent:** These are Esotech defaults. Optimize for consistency across a long-lived codebase.

---

## Non‑Negotiables

- **Indentation:** Tabs (display width 4)
- **Spaces inside parentheses:** `fn( $arg )`, `if ( $cond )`
- **No space** between function name and `(`
- **Type casts:** space after cast: `(int) $value`
- **Array access:** no spaces: `$arr['key']`

---

## Indentation & Spacing
- **Indentation:** Tabs (4-space width)
- **Spacing:** Spaces inside parentheses around function parameters
  - ✅ `function myFunction( $param )`
  - ❌ `function myFunction($param)`
- **No space** between function name and opening parenthesis
- **Type casts:** Space after cast: `$var = (int) $value;`
- **Array access:** No spaces: `$array['key']`

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | CamelCase | `LeadService` |
| Methods | camelCase | `getLeadById()` |
| Variables | snake_case | `$lead_data` |
| Properties | snake_case | `$this->account_id` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |

---

## Arrays
```php
// Single-line: spaces inside brackets
$arr = [ 'key' => 'value' ];

// Multi-line: each pair on own line
$arr = [
    'key1' => 'value1',
    'key2' => 'value2',
];

// Access: no spaces
$value = $arr['key'];
```

---

## Control Structures
```php
// Opening braces on same line
if ( $condition ) {
    // statement
}

// Always use braces, even for single lines
if ( $condition ) {
    return true;
}

// Single-line returns are acceptable
if ( $x ) return 'ok';
```

---

## Closures
```php
$my_closure = function ( $x ) {
    return $x * 2;
};
```

---

## Ternary Operators
```php
// Simple: single line
$value = $condition ? $true_value : $false_value;

// Complex: multi-line with indentation
$value = $condition
    ? ( $condition2 ? $true_value : $alt_value )
    : $default_value;
```

---

## TODO (Refinement Targets)

- Decide on `declare( strict_types=1 );` default (yes/no)
- Return types / parameter types policy (required vs pragmatic)
- DocBlocks policy (public API only vs everywhere)
- Framework specifics (Laravel/Symfony/none) if applicable
