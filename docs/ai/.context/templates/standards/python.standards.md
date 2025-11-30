# Python Coding Standards

> **Language:** Python
> **Generated:** {DATE}

---

## Formatting

### Indentation
- **Style:** {spaces}
- **Size:** {4} {spaces}

### Line Length
- **Max Length:** {88|100|120} chars
- **Docstrings:** {72} chars

### Imports
- **Sort Order:** {Standard Library} > {Third Party} > {Local Application}
- **Style:** {Absolute imports preferred}

---

## Naming Conventions

### Classes
- **Style:** PascalCase
- **Example:** `UserContext`, `PaymentProcessor`

### Functions/Methods
- **Style:** snake_case
- **Example:** `get_user_by_id()`, `process_payment()`

### Variables
- **Style:** snake_case
- **Example:** `user_name`, `is_active`

### Constants
- **Style:** UPPER_SNAKE_CASE
- **Example:** `MAX_RETRY_COUNT`, `API_VERSION`

### Private Members
- **Style:** {underscore prefix}
- **Example:** `_private_method()`, `_internal_var`

---

## Structure

### File Organization
```python
# 1. Shebang (if executable)
#!/usr/bin/env python3

# 2. Module Docstring
"""
Module description.
"""

# 3. Imports
import os
from typing import List, Optional

# 4. Constants
MAX_RETRIES = 3

# 5. Classes
class MyClass:
    """Class docstring."""

    def __init__(self):
        pass

# 6. Main execution
if __name__ == "__main__":
    pass
```

---

## Type Hints (PEP 484)

### Parameters & Returns
```python
# {Required|Preferred}
def process(name: str, count: int = 0) -> None:
    pass
```

### Variables (PEP 526)
```python
# {Optional|Preferred}
user_id: int = 123
```

---

## Documentation (Docstrings)

### Style
- **Format:** {Google|NumPy|Sphinx/reST}

#### Google Style Example
```python
def fetch_data(url: str) -> dict:
    """Fetches data from the API.

    Args:
        url: The endpoint URL.

    Returns:
        A dictionary containing the response data.

    Raises:
        ConnectionError: If the request fails.
    """
```

---

## Error Handling

### Exceptions
```python
try:
    process_data()
except ValueError as e:
    logger.error(f"Validation error: {e}")
except Exception:
    # Catch-all only if necessary
    raise
```

---

## Common Patterns

### List Comprehensions
```python
# Preferred for simple transformations
names = [u.name for u in users if u.is_active]
```

### Context Managers
```python
# Preferred for resource management
with open("file.txt") as f:
    content = f.read()
```

---

## Anti-Patterns

```python
# BAD: Mutable default arguments
def add_item(item, list=[]):
    list.append(item)

# GOOD:
def add_item(item, list=None):
    if list is None:
        list = []
    list.append(item)
```

---

## Framework-Specific

{Add Django/Flask/FastAPI specific conventions here}

---

*This file should be customized for your project. Replace placeholders with actual values.*
