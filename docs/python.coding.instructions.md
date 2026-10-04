# Python Coding Conventions

## Python Instructions

- Write clear and concise comments for each function.
- Ensure functions have descriptive names and include type hints.
- Provide docstrings describing the "why" and usage scenarios. Avoid redundancy: do not document parameter/return types in docstrings if hints are sufficient.
- Use native type built-ins for annotations (e.g., `list[str]`, `dict[str, int]`) instead of `typing` module aliases (`List`, `Dict`).
- Break down complex functions into smaller, more manageable functions.

## General Instructions

- Always prioritize readability and clarity.
- For algorithm-related code, include explanations of the approach used.
- Write code with good maintainability practices, including comments on why certain design decisions were made.
- Handle edge cases and write clear exception handling.
- For libraries or external dependencies, mention their usage and purpose in comments.
- Use consistent naming conventions and follow language-specific best practices.
- Write concise, efficient, and idiomatic code that is also easily understandable.


## Naming Conventions

- **Use full, unabbreviated words** in all identifiers. Never shorten names, such as single-character variables. Spell out every word completely.
- **Maintain a consistent lexicon** across the entire codebase. Once a term is chosen to represent a domain concept, use that exact term everywhere — in variable names, function names, class names, module names, comments, and documentation.
    - If you call it `customer` in one module, never refer to the same concept as `client`, `user`, or `buyer` elsewhere.
    - If you call it `fetch_orders`, do not name a similar operation `get_orders`, `retrieve_orders`, or `load_orders` in another context without deliberate distinction.
    - Document the canonical lexicon for domain terms when ambiguity is possible, and defer to established names already present in the codebase.
- **Prefer descriptive compound names** over single generic words. A name should communicate intent and scope without requiring the reader to inspect the implementation.
    - `retry_delay_seconds` not `delay`
    - `maximum_connection_count` not `limit`
    - `is_payment_overdue` not `overdue`
- **Loop variables and comprehensions** are not exempt. Use meaningful names even in short-lived scopes.
    - `for order in orders:` not `for o in orders:`
    - `for row_index, row in enumerate(rows):` not `for i, r in enumerate(rows):`

## Code Style and Formatting

- Follow the **PEP 8** style guide for Python.
- Maintain proper indentation (use 4 spaces for each level of indentation).
- Ensure lines do not exceed 79 characters.
- Place function and class docstrings immediately after the `def` or `class` keyword.
- Use blank lines to separate functions, classes, and code blocks where appropriate.
- Avoid `hasattr, getattr, setattr` and use only as a last resort, in case their usage is required, the abstractions, used in the code are leaky and require refactoring. Refactor the target classes instead!
- Avoid inline imports or imports inside of functions or classes even if you think that it is more performant, all imports are set at the start of a module.
 - Avoid nested function, class definitions, imports; prefer top-level definitions for clarity and testability.

## Testing with Pytest

- Use **pytest** for testing.
- Avoid class-based test suites; use function-based tests and parametrize where needed.
- Target **1 cyclomatic complexity** for test functions (linear flow, no loops/branches). Use `pytest.mark.parametrize` for data-driven cases.
- Follow the **AAA** (Arrange-Act-Assert) pattern.
- Always include test cases for critical paths of the application.
- Account for common edge cases like empty inputs, invalid data types, and large datasets.

## Example of Proper Documentation

```python
import math

def calculate_area(radius: float) -> float:
    """Calculates the area of a circle."""
    return math.pi * radius ** 2
```
