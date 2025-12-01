# Contextuate Coding Standards

> **Purpose:** Default coding standards for AI assistants.

---

## Standards Resolution Order

When looking up coding standards for a specific language, follow this order:

1. **User Standards (First Priority)**
   Check `docs/ai/standards/{language}.standards.md`
   - Example: `docs/ai/standards/php.standards.md`
   - These are project-specific customizations

2. **Framework Standards (Fallback)**
   Check `docs/ai/.context/templates/standards/{language}.standards.md`
   - Example: `docs/ai/.context/templates/standards/php.standards.md`
   - These are framework-provided defaults

3. **General Principles (Always Apply)**
   The general principles below always apply regardless of language.

### Supported Framework Standards

| Language | Template Location |
|----------|-------------------|
| PHP | `templates/standards/php.standards.md` |
| JavaScript/TypeScript | `templates/standards/javascript.standards.md` |

*Use the [Standards Detector](../tools/standards-detector.tool.md) to generate project-specific standards.*

---

## General Principles

### Code Quality
- Write clean, readable, maintainable code
- Follow existing patterns in the codebase
- Prefer simplicity over cleverness
- Don't over-engineer solutions

### Comments
- Write self-documenting code where possible
- Add comments for complex logic or non-obvious decisions
- Don't add comments that merely restate the code
- Keep comments up-to-date with code changes

### Naming
- Use descriptive, meaningful names
- Be consistent with existing conventions in the codebase
- Avoid abbreviations unless widely understood

---

## Language-Specific Defaults

### PHP
```php
// Indentation: Tabs (unless project specifies spaces)
// Braces: Same line for functions/classes
// Spacing: Space after keywords (if, for, while)

class MyClass
{
	public function myMethod( $param )
	{
		if( $condition ){
			// code
		}
	}
}
```

### JavaScript/TypeScript
```javascript
// Indentation: Tabs (unless project specifies spaces)
// Semicolons: Follow project convention
// Quotes: Follow project convention (single or double)

class MyClass {
	constructor( param ) {
		this.param = param;
	}

	async myMethod() {
		// Prefer async/await over promise chains
	}
}
```

### Python
```python
# Follow PEP 8
# Indentation: 4 spaces
# Line length: 88-120 characters (project preference)

class MyClass:
    def my_method(self, param):
        """Docstring for method."""
        pass
```

### SQL
```sql
-- Keywords: UPPERCASE
-- Identifiers: lowercase_snake_case
-- Indentation: Consistent (2 or 4 spaces)

SELECT
    column_name,
    another_column
FROM table_name
WHERE condition = 'value'
ORDER BY column_name;
```

---

## File Organization

### General
- One class/component per file (unless tightly coupled)
- Group related files in directories
- Use consistent file naming conventions

### Documentation Files
- Use `.md` extension for Markdown
- Use descriptive filenames: `feature-name.md` not `doc1.md`
- Keep documentation close to the code it describes

---

## Version Control

### Commits
- Write clear, descriptive commit messages
- Use present tense: "Add feature" not "Added feature"
- Reference issues/tickets when applicable

### Branches
- Use descriptive branch names
- Follow project branching strategy

---

## Creating Project Standards

To customize standards for your project:

1. **Run Standards Detector** (recommended)
   Have AI analyze your codebase using the [Standards Detector](../tools/standards-detector.tool.md) tool.
   This creates files in `docs/ai/standards/` based on your existing code.

2. **Copy and Modify Template**
   Copy a framework template to `docs/ai/standards/`:
   ```bash
   cp docs/ai/.context/templates/standards/php.standards.md docs/ai/standards/
   ```
   Then customize the placeholders.

3. **Create from Scratch**
   Create `docs/ai/standards/{language}.standards.md` with your own format.

### Common Customizations

- Indentation (tabs vs spaces, size)
- Naming conventions (camelCase, snake_case, etc.)
- File structure and organization
- Framework-specific patterns
- Documentation requirements
