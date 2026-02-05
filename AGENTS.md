# AGENTS.md

## Project Summary
Skallars Spirograph is a Next.js 14 (App Router) site for a law office with a Supabase backend. The public site renders multilingual marketing content and articles. The admin panel manages site content, articles, team, client logos, map cities, users, and AI settings. The AI lab uses Gemini for article generation and image generation.

## Current Product Priorities (Owner)
1. **Admin Panel Content Editing**: Full-featured, intuitive editing for website content (primarily text, also graphics). Current implementation is basic and needs to become comprehensive and pleasant for admins.
2. **AI Generation UX (Adjustments Only)**: AI article generation is already good; focus on alignment, clarity, and small UX improvements where the UI does not reflect actual behavior.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript.
- **UI**: Tailwind CSS (`@tailwindcss/typography`), shadcn/ui components, Radix UI, lucide-react + hugeicons-react.
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
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; optional for `/api/blog` to bypass RLS while still filtering published articles)
- `LINKEDIN_CLIENT_ID` (server-only)
- `LINKEDIN_CLIENT_SECRET` (server-only)
- `LINKEDIN_REDIRECT_URI` (server-only; must match LinkedIn app settings)
- `LINKEDIN_SCHEDULER_SECRET` (server-only; required for cron to run scheduled shares)

## Supabase Data Model (as used in code)
Tables referenced in app code:
- `profiles` (role, email, full_name). Used for admin/editor roles in `AuthContext`.
- `site_content` (key, value_sk/en/de/cn, content_type, section, description). Used by `ContentManager`.
- `content_registry` (sections + field metadata for content editor).
- `site_content_drafts` (draft values + published state).
- `articles` (title_*, excerpt_*, content_*, slug, cover_image_url, tags, is_published, published_at, author_id).
- `tags`, `article_tags` (tagging for articles).
- `settings` (gemini_api_key, gemini_image_api_key, gemini_model, gemini_image_model, image_model, image_count).
- `ai_usage_logs` (token tracking and usage records).
- `ai_generation_logs` (AI generation diagnostics).
- `admin_access_logs` (admin permission diagnostics).
- `linkedin_accounts` (per-user OAuth tokens + LinkedIn member info).
- `linkedin_oauth_states` (short-lived OAuth state for connect flow).
- `linkedin_share_logs` (share status + errors).
- `linkedin_share_queue` (scheduled LinkedIn shares).
- `team_members` (team bios and photos).
- `clients` (client logos).
- `map_cities` (global network map).
- `page_sections` (homepage layout order + visibility).
- `service_items` (services list items + enable/disable + order).
- `news_settings` (limit/autoplay/CTA visibility).
- `client_settings` (carousel speed/visibility).
- `team_settings` (columns + show/hide flags).
- `footer_settings` (column visibility + social flag).
- `footer_links` (solutions + social links, multilingual).
- `countries_settings` (map stats/labels/controls + default focus).
- `page_blocks` (callout/testimonials/faq blocks + enabled/order).
- `page_block_items` (testimonial/faq items + enabled/order).
- `media_library` (image assets with tags + public URLs).
- `content_history` (published site_content revisions).

Storage buckets referenced:
- `images` (covers, team, client logos).

## Admin Panel Modules
- **Content**: `src/components/admin/ContentManager.tsx` editing of `site_content` with translation helper.
- **Layout**: `src/components/admin/PageLayoutManager.tsx` manages homepage order/visibility.
- **Blocks**: `PageBlocksManager.tsx` with block templates + `PageBlockItemsManager.tsx` for testimonials/FAQ items.
- **Media**: `MediaLibraryManager.tsx` for uploads + URL copy.
- **Services**: `ServiceItemsManager.tsx` for services list items.
- **News**: `NewsSettingsManager.tsx` for blog carousel settings.
- **Clients**: `ClientSettingsManager.tsx` + `ClientLogosManager.tsx`.
- **Team**: `TeamSettingsManager.tsx` + `TeamMembersManager.tsx`.
- **Footer**: `FooterSettingsManager.tsx` + `FooterLinksManager.tsx`.
- **Map Countries**: `CountriesSettingsPanel.tsx` (in Map tab).
- **AI Lab**: `src/components/admin/AILab.tsx` for article generation (Gemini text).
- **AI Settings**: `src/components/admin/AISettings.tsx` for API keys/models + image preferences.
- **Articles**: `src/components/admin/ArticlesManager.tsx` and `ArticleEditor.tsx`.
- **Map Cities**: `MapCitiesManager.tsx`.
- **Users**: `UserManagement.tsx` for roles.

## AI System Notes
- Text generation uses `generateAIArticle` in `src/lib/aiService.ts`.
- Prompt is built by `getAIArticlePrompt` and supports type, length, and target languages.
- **Enhanced Formatting**: Prompts now strictly enforce semantic HTML with bolding (`<strong>`) for skimmability, blockquotes for insights, and frequent subheadings (`<h3>`).
- **Citations**: Inline citations (`<sup>[1]</sup>`) and clickable source links are enforced when grounding is used.
- Grounding uses `googleSearch` tool; JSON response mode is avoided when grounding is enabled.
- Image generation uses a two-tier system:
  - Turbo: Pollinations (Flux) for fast, no-key images.
  - Pro: Gemini native image models use `generateContent` with `responseModalities` + `imageConfig`, Imagen models use `predict`; fallback to Turbo on failure.
  - Custom image model names can be set in AI Settings (`gemini_image_model`).
  - Image generation can use a separate API key (`gemini_image_api_key`). Article Editor uses global defaults with an override toggle.

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
- Do not alter the **Map Cities coordinate algorithm** or map projection logic; it’s validated and should stay stable.
- The **Hero spirograph** is a permanent graphic; do not replace it with editable images.

## Content Seeds
- Generator: `scripts/generate_site_content_seeds.mjs`
- Outputs:
  - `supabase/seed_site_content_overrides.sql`
  - `supabase/seed_content_registry.sql`
## Content Drafts
- Schema update: `supabase/site_content_drafts.sql`

## LinkedIn SQL
- Initial tables: `supabase/linkedin_schema.sql`, `supabase/linkedin_share_queue.sql`
- Upgrade (adds image share columns): `supabase/linkedin_share_queue_upgrade.sql`

## Current Gaps (Known)
- Content editing is field-based, not a full CMS or page builder.
- Article editor is plain text/markdown; no rich text editor or image blocks.
- No structured workflow for AI research quality, citations, or editorial review.
- Admin permission gating can be brittle; diagnostics are available but logging could be deeper.

## Admin UI vs Functionality Audit (Feb 3, 2026)
High-impact mismatches found and now resolved:
- Content edits now render on the public site via `site_content` overrides. ✅
- Article editor copy aligned with HTML rendering. ✅
- Map settings persisted (no more “saved automatically” mismatch). ✅
- Team member photo positioning preserved on edit. ✅
- Image batch count honored or removed. ✅
- AI usage cost estimate aligned with selected model. ✅
- **Blog Rendering**: Fixed unformatted text by installing `@tailwindcss/typography`. ✅
