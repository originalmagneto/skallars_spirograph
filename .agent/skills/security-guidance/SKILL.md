---
name: security-guidance
description: >-
  Security awareness and vulnerability detection during code editing.
  Monitors for common security patterns: command injection, XSS, eval usage,
  dangerous HTML, pickle deserialization, os.system calls.
  Use when editing security-sensitive code or reviewing for vulnerabilities.
---

# Security Guidance Skill

Security patterns to watch for when editing code.

## Quick Reference

### High-Risk Patterns

| Pattern | Risk | Example |
|---------|------|---------|
| **Command injection** | Critical | `exec(userInput)`, `os.system(cmd)` |
| **XSS** | High | `innerHTML = userInput` |
| **SQL injection** | Critical | String concatenation in queries |
| **Eval** | Critical | `eval()`, `Function()` |
| **Pickle** | High | `pickle.loads(untrusted)` |

### Safe Alternatives

```typescript
// BAD: Command injection
exec(`rm ${userInput}`);

// GOOD: Use parameterized approach
execFile('rm', [sanitizedPath]);
```

```typescript
// BAD: XSS via innerHTML
element.innerHTML = userInput;

// GOOD: Use textContent or sanitization
element.textContent = userInput;
// OR
element.innerHTML = DOMPurify.sanitize(userInput);
```

```sql
-- BAD: SQL injection
query = "SELECT * FROM users WHERE id = " + userId;

-- GOOD: Parameterized query
query = "SELECT * FROM users WHERE id = $1";
params = [userId];
```

## Security Checklist

```
□ User input sanitized before use?
□ Queries parameterized (not concatenated)?
□ No eval/exec with dynamic content?
□ HTML output escaped/sanitized?
□ Secrets not hardcoded?
□ Authentication checked on sensitive routes?
□ Authorization verified for resource access?
```

## Framework-Specific

### React/Next.js
- Avoid `dangerouslySetInnerHTML` with user input
- Use `encodeURIComponent` for URL params
- Validate API route inputs

### Supabase
- Use RLS policies for data access
- Never expose service role key client-side
- Validate data on server before insert

## When to Escalate

Flag for human review:
- Any command execution with user input
- Auth/authorization changes
- Database schema changes
- API key or secret handling
- File system access patterns
