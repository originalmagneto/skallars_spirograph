---
name: code-review
description: >-
  Automated code review for pull requests with confidence-based scoring.
  Checks for CLAUDE.md compliance, obvious bugs, and historical context.
  Use when reviewing PRs, auditing code changes, or performing quality checks.
---

# Code Review Skill

Perform systematic code review with confidence-based scoring to filter false positives.

## Quick Start

When reviewing code changes:

1. **Gather context**: Check for CLAUDE.md or project guidelines
2. **Analyze changes**: Focus on diff, not pre-existing code
3. **Score issues**: Rate each finding 0-100 for confidence
4. **Filter output**: Only report issues ≥80 confidence

## Review Perspectives

| Perspective | Focus |
|-------------|-------|
| **Guidelines** | CLAUDE.md compliance, project conventions |
| **Bugs** | Obvious bugs introduced by changes |
| **History** | Context from git blame, existing patterns |
| **Security** | Auth, injection, data exposure |

## Confidence Scoring

| Score | Meaning | Action |
|-------|---------|--------|
| 0-25 | Likely false positive | Skip |
| 26-50 | Uncertain, minor | Skip |
| 51-79 | Probably real | Review |
| **80-100** | Confident, actionable | **Report** |

## False Positive Filters

Skip these:
- Pre-existing issues (not in diff)
- Linter-catchable issues
- Pedantic nitpicks
- Code with ignore comments

## Output Format

```markdown
## Code Review

Found N issues:

1. **[Category]**: Issue description (confidence: XX)
   - File: path/to/file.ts#L10-L15
   - Reason: Why this is problematic
   - Suggestion: How to fix
```

## Review Checklist

```
□ Is this a new issue (in diff)?
□ Does it violate explicit guidelines?
□ Is confidence ≥80?
□ Is it actionable?
□ Would it cause real problems?
```
