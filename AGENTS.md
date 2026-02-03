# AGENTS.md

## Project Summary
Skallars Spirograph is a Next.js 14 (App Router) site for a law office with a Supabase backend. The public site renders multilingual marketing content and articles. The admin panel manages site content, articles, team, client logos, map cities, users, and AI settings. The AI lab uses Gemini for article generation and image generation.

## Current Product Priorities (Owner)
1. **Admin Panel Content Editing**: Full-featured, intuitive editing for website content (primarily text, also graphics). Current implementation is basic and needs to become comprehensive and pleasant for admins.
2. **AI Generation UX (Adjustments Only)**: AI article generation is already good; focus on alignment, clarity, and small UX improvements where the UI does not reflect actual behavior.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript.
- **UI**: Tailwind CSS, shadcn/ui components, Radix UI, lucide-react + hugeicons-react.
- **Data**: Supabase (PostgreSQL + Auth + Storage).
- **State/Fetching**: TanStack Query.
- **AI**: Google Gemini via Generative Language API. Optional grounding via `googleSearch` tool.

## Key Directories
- `src/app`: App Router pages and API routes.
- `src/app/admin`: Admin layout and pages.
- `src/components/admin`: Admin panel features (content, AI lab, articles, settings).
- `src/lib`: Supabase client and AI service.
- `src/contexts`: Auth context and role checks.
- `public`: Static assets.
- `scripts`: Local utility scripts (seed generators).
- `supabase`: SQL helpers and seed files.

## Local Dev Commands
- `npm run dev` - Next.js dev server.
- `npm run build` - Production build.
- `npm run start` - Start production server.

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Supabase Data Model (as used in code)
Tables referenced in app code:
- `profiles` (role, email, full_name). Used for admin/editor roles in `AuthContext`.
- `site_content` (key, value_sk/en/de/cn, content_type, section, description). Used by `ContentManager`.
- `articles` (title_*, excerpt_*, content_*, slug, cover_image_url, is_published, published_at, author_id).
- `tags`, `article_tags` (tagging for articles).
- `settings` (gemini_api_key, gemini_model, gemini_image_model, image_model, image_count).
- `ai_usage_logs` (token tracking and usage records).
- `team_members` (team bios and photos).
- `clients` (client logos).
- `map_cities` (global network map).

Storage buckets referenced:
- `images` (covers, team, client logos).

## Admin Panel Modules
- **Content**: `src/components/admin/ContentManager.tsx` editing of `site_content` with translation helper.
- **AI Lab**: `src/components/admin/AILab.tsx` for article generation (Gemini text).
- **AI Settings**: `src/components/admin/AISettings.tsx` for API keys/models + image preferences.
- **Articles**: `src/components/admin/ArticlesManager.tsx` and `ArticleEditor.tsx`.
- **Team**: `TeamMembersManager.tsx` with storage uploads.
- **Clients**: `ClientLogosManager.tsx` with storage uploads.
- **Map Cities**: `MapCitiesManager.tsx`.
- **Users**: `UserManagement.tsx` for roles.

## AI System Notes
- Text generation uses `generateAIArticle` in `src/lib/aiService.ts`.
- Prompt is built by `getAIArticlePrompt` and supports type, length, and target languages.
- Grounding uses `googleSearch` tool; JSON response mode is avoided when grounding is enabled.
- Image generation uses a two-tier system:
  - Turbo: Pollinations (Flux) for fast, no-key images.
  - Pro: Gemini Imagen via Generative Language API (fallback to Turbo on failure).

## Auth and Roles
- Supabase Auth handles sessions; role is fetched from `profiles.role`.
- `isAdmin` and `isEditor` gates access to admin routes and actions.

## Code Conventions
- Use `@/` path alias for imports under `src`.
- Tailwind for styling; shadcn/ui for UI primitives.
- Keep admin components under `src/components/admin`.
- Be careful with client-only code in App Router; many admin components are `use client`.

## Guardrails for Changes
- Preserve Supabase table/column names already referenced in code.
- Avoid breaking the multilingual content pattern (`_sk`, `_en`, `_de`, `_cn`).
- Keep admin routes gated by role checks in `AuthContext` and `admin/layout.tsx`.
- For AI features, handle API failures gracefully and log usage to `ai_usage_logs`.
- `site_content.key` should use dot-paths that match `src/lib/translations.ts` (example: `hero.title`, `services.items.corporate.description`) to override frontend copy.

## Content Seeds
- Generator: `scripts/generate_site_content_seeds.mjs`
- Outputs:
  - `supabase/seed_site_content_overrides.sql`
  - `supabase/seed_content_registry.sql`
## Content Drafts
- Schema update: `supabase/site_content_drafts.sql`

## Current Gaps (Known)
- Content editing is field-based, not a full CMS or page builder.
- Article editor is plain text/markdown; no rich text editor or image blocks.
- Image generation has no UI (only settings + backend function).
- No structured workflow for AI research quality, citations, or editorial review.

## Admin UI vs Functionality Audit (Feb 3, 2026)
High-impact mismatches and gaps found in current code:
- **Content Manager does not affect the website**: `site_content` is only used in admin (`ContentManager.tsx`) and is not referenced in frontend rendering. Public site strings come from `src/lib/translations.ts` and component-local content, so admin edits do not update the live site.
- **Article editor claims Markdown but frontend expects HTML**: `ArticleEditor.tsx` says “Supports Markdown formatting” while the blog viewer (`ArticleViewer.tsx`) renders content with `dangerouslySetInnerHTML` and the AI prompt outputs HTML. This is misleading and risks broken rendering.
- **Map Settings “saved automatically” is not true**: `MapSettingsPanel.tsx` claims auto-save, but settings live only in `MapSettingsContext` state and are not persisted to Supabase or local storage. Refreshing loses changes.
- **Team Member photo positioning resets on edit**: `TeamMembersManager.tsx` doesn’t load `photo_position_x/y` into the edit form, so saving an edit overwrites existing positioning with defaults (50/50).
- **AI image batch count not implemented**: `image_count` is configurable in `AISettings.tsx`, but `generateAIImage` ignores it and no UI uses it for batch generation.
- **AI usage cost estimate can be inaccurate**: `AIUsageStats.tsx` assumes Gemini 1.5 Pro pricing regardless of the selected model, so the displayed cost can be misleading.
