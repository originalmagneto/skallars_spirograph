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
- Consolidated AI content pipeline guide (Gemini articles + images + LinkedIn):
  - `docs/ai-content-pipeline-playbook.md`
- Gemini article reliability deep-dive:
  - `docs/gemini-article-generation-playbook.md`
- Article rendering reference (prompt contract + preview + public blog rendering):
  - `docs/article-rendering-reference.md`
- Settings stats + LinkedIn implementation and validation guide:
  - `docs/settings-stats-linkedin-implementation.md`
- Product plan:
  - `ROADMAP.md`

## Core AI Files
- Article + AI logic:
  - `src/lib/aiService.ts`
- AI prompt defaults + settings snapshot fallback:
  - `src/lib/aiSettings.ts`
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
If you want to reuse this implementation in another project, start with:
- `docs/ai-content-pipeline-playbook.md`

Then use:
- `docs/gemini-article-generation-playbook.md` for article-generation internals and reliability deep-dive details.
