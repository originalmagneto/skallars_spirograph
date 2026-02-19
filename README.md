# Skallars Spirograph

Skallars Spirograph is a multilingual law-firm website + admin panel built with Next.js, Supabase, and Gemini.

## Stack
- Next.js 15 (App Router), React 18, TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres/Auth/Storage)
- Gemini API for article generation and image generation

## Local Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run start
```

## Key Documentation
- Project operating context and change log:
  - `AGENTS.md`
- Gemini article generation reliability/reuse guide:
  - `docs/gemini-article-generation-playbook.md`
- Product plan:
  - `ROADMAP.md`

## Core AI Files
- Article + AI logic:
  - `src/lib/aiService.ts`
- Admin generation UI:
  - `src/components/admin/AILab.tsx`
- AI settings UI:
  - `src/components/admin/AISettings.tsx`

## Environment Variables
At minimum:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For Gemini + LinkedIn workflows, see full env list in `AGENTS.md`.

## Notes for Future Projects
If you want to reuse this Gemini implementation, start with:
- `docs/gemini-article-generation-playbook.md`

It documents the bounded-call architecture, multilingual generation strategy (primary language + per-language translation), and recoverable-output UX pattern used to prevent token waste and lost article drafts.
