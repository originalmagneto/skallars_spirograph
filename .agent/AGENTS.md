# AGENTS.md - AI Agent Configuration

> Best practices and configuration for AI agents working on this project.

## Available Skills

Skills are modular instruction packages that AI agents load on-demand for specialized tasks.

| Skill | Description | Trigger phrases |
|-------|-------------|-----------------|
| `frontend-design` | Premium UI/UX development with distinctive aesthetics | "build UI", "create component", "design page" |
| `building-glamorous-tuis` | Terminal UI with Charmbracelet (Gum, Bubble Tea) | "terminal UI", "CLI tool", "TUI" |
| `crafting-readme-files` | Professional README documentation | "write README", "project documentation" |
| `creating-share-images` | Social media / OG images for sharing | "share image", "social preview", "OG image" |
| `code-review` | PR review with confidence scoring | "review code", "audit changes", "PR review" |
| `security-guidance` | Security patterns and vulnerability detection | "security check", "vulnerability", "audit security" |

## Skill Usage Guidelines

### 1. When to Use Skills
- **Complex workflows** requiring domain expertise
- **Repeatable patterns** that benefit from standardization
- **Task-specific knowledge** not in base model training

### 2. Skill Structure
```
.agent/skills/[skill-name]/
├── SKILL.md                # Required: instructions + YAML frontmatter
├── references/             # Optional: detailed documentation
└── scripts/                # Optional: executable code
```

### 3. Frontmatter Format
```yaml
---
name: skill-name            # lowercase, hyphens only, ≤64 chars
description: >-             # What + when to use, ≤1024 chars
  Brief description of capabilities.
  Use when [trigger phrases, contexts, file types].
---
```

## Project-Specific Rules

### Code Style
- **TypeScript/React**: Follow Next.js 14 conventions
- **Styling**: Tailwind CSS with shadcn/ui components
- **Imports**: Use `@/` path alias for src directory

### Design System
- **Typography**: Bricolage Grotesque (display) + DM Sans (body)
- **Colors**: HSL tokens defined in `globals.css`
- **Components**: shadcn/ui with custom glass effects

### Backend
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with role-based access
- **Queries**: TanStack Query for data fetching

## Adding New Skills

1. Create directory: `.agent/skills/[skill-name]/`
2. Create `SKILL.md` with YAML frontmatter
3. Add references in `references/` if needed
4. Test with relevant prompts

## Quick Reference

```
SKILL.md CHECKLIST
═══════════════════════════════════════════════════
□ name: lowercase, hyphens, ≤64 chars
□ description: third person, specific triggers
□ Body: <500 lines, progressive disclosure
□ References: one level deep from SKILL.md
□ Examples concrete, not abstract
```
