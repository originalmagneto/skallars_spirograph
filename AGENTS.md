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
- `LINKEDIN_ENABLE_ORG_SCOPES` (server-only; set to `true` to request org scopes)
- `LINKEDIN_ENABLE_MEMBER_READ_SCOPE` (server-only; set to `true` to request `r_member_social` for member engagement reads)
- `LINKEDIN_API_VERSION` (server-only; optional override for LinkedIn REST `LinkedIn-Version` header, defaults to `202601`)

## Supabase Data Model (as used in code)
Tables referenced in app code:
- `profiles` (role, email, full_name). Used for admin/editor roles in `AuthContext`.
- `site_content` (key, value_sk/en/de/cn, content_type, section, description). Used by `ContentManager`.
- `content_registry` (sections + field metadata for content editor).
- `site_content_drafts` (draft values + published state).
- `articles` (title_*, excerpt_*, content_*, slug, cover_image_url, tags, is_published, published_at, author_id).
- `tags`, `article_tags` (tagging for articles).
- `settings` (gemini_api_key, gemini_image_api_key, gemini_model, gemini_image_model, image_model, image_count, linkedin_default_org_urn).
- `settings` (gemini_article_model, gemini_article_thinking_budget) for Article Studio overrides.
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
- **LinkedIn Settings**: `src/components/admin/LinkedInSettings.tsx` for default org URN + share logs.
- **Articles**: `src/components/admin/ArticlesManager.tsx` and `ArticleEditor.tsx`.
- **Map Cities**: `MapCitiesManager.tsx`.
- **Users**: `UserManagement.tsx` for roles.

## AI System Notes
- Text generation uses `generateAIArticle` in `src/lib/aiService.ts`.
- Prompt is built by `getAIArticlePrompt` and supports type, length, and target languages.
- **Enhanced Formatting**: Prompts now strictly enforce semantic HTML with bolding (`<strong>`) for skimmability, blockquotes for insights, and frequent subheadings (`<h3>`).
- **Citations**: Inline citations (`<sup>[1]</sup>`) and clickable source links are enforced when grounding is used.
- Grounding uses `googleSearch` tool; JSON is still enforced and parsed with repair fallback.
- Article Studio can override the global model with `gemini_article_model` and `gemini_article_thinking_budget`.
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
- Upgrade (adds `share_mode` + indexes for logs): `supabase/linkedin_share_logs_upgrade.sql`

## Core Supabase SQL
- Base tables: `supabase/articles.sql`, `supabase/tags.sql`, `supabase/article_tags.sql`, `supabase/site_content.sql`, `supabase/settings.sql`, `supabase/ai_usage_logs.sql`, `supabase/clients.sql`, `supabase/team_members.sql`, `supabase/map_cities.sql`

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

## Change Log (Feb 5, 2026)
- **User Profiles & Stats**:
  - Added `avatar_url` to `profiles` table.
  - Added "Edit Profile" dialog in `UserManagement.tsx` (Display Name & Avatar).
  - Updated `AIUsageStats.tsx` to server-side join log data with user profiles (Avatar/Name).
  - Updated `AILab.tsx` to log generated Article Titles instead of just prompts.
- **Database Synchronization**:
  - Enforced `user_id` FK relationship between `ai_usage_logs` and `profiles`.
  - Created `repair_relationship_v3.sql` to handle massive RLS policy dependencies during schema updates.
- **Build Fixes**:
  - Fixed Netlify build failure in `AISettings.tsx` by removing invalid `variant` prop from HugeIcons.

## Change Log (Feb 10, 2026)
- **LinkedIn Generation -> Share Flow**:
  - Added post-generation actions in `AILab.tsx` to save draft and open LinkedIn share panel directly.
  - Added preselection support for LinkedIn target in `ArticleEditor.tsx` via `linkedinTarget` query param.
- **LinkedIn Scheduling Reliability**:
  - Hardened Netlify scheduler URL resolution in `netlify/functions/linkedin-scheduler.ts` (supports `NEXT_PUBLIC_SITE_URL`, `URL`, `DEPLOY_PRIME_URL`, `DEPLOY_URL`, `SITE_URL`) with timeout handling.
  - Improved queue lock handling in `src/app/api/linkedin/run-scheduled/route.ts` to avoid double-processing race cases.
- **LinkedIn Share Tracking + Metrics**:
  - Persisted `share_mode` in LinkedIn share logs from both direct share and scheduled execution routes.
  - Added schema fallback handling when `share_mode` is not present yet.
  - Added engagement enrichment (likes/comments/shares + org impressions/clicks where available) in:
    - `src/app/api/linkedin/logs-summary/route.ts`
    - `src/app/api/linkedin/logs/route.ts`
  - Updated `ArticlesManager.tsx` to show LinkedIn interaction snippets in list rows and added explicit LinkedIn sync action.
  - Updated `ArticleEditor.tsx` to display per-share LinkedIn metrics in advanced logs and keep LinkedIn activity synchronized.

## Change Log (Feb 10, 2026 - UX Pass 2)
- **Settings Workspace De-clutter**:
  - Split admin settings into dedicated panels (`AI Usage & Config`, `LinkedIn`, `SEO`) via `settingsPanel` query param in `src/app/admin/page.tsx`.
  - Split AI workspace into tabs in `src/components/admin/AISettings.tsx`:
    - `Usage & Tracking`
    - `Provider & Policies`
  - Refined `src/components/admin/LinkedInSettings.tsx` with top-level KPI cards (success/fail/queued/with-metrics) and auto-expanded advanced sections in Power mode.
  - Added generation-level tracking API in `src/app/api/admin/ai-generation-summary/route.ts`.
  - Updated `src/components/admin/AIUsageStats.tsx` with tracked generation totals, cap notice, and corrected monthly trend scaling.
- **Article List Workflow UX** (`src/components/admin/ArticlesManager.tsx`):
  - Added deep-link based edit/create/share flow (`edit`, `create`, `panel=linkedin`) for consistent navigation.
  - Added workflow-aware overview counters: `Ready for LinkedIn` and `LinkedIn Queued`.
  - Added per-article next-step messaging and action emphasis (e.g., promote LinkedIn publish CTA for published-but-unshared articles).
- **Article Editor Workflow UX** (`src/components/admin/ArticleEditor.tsx`):
  - Simplified header actions (Back, status, Save, Delete) and moved workflow controls into a dedicated `Workflow Checklist` panel.
  - Added explicit content readiness checklist (Title/Excerpt/Slug/Content) and publish/distribution status snapshots.
  - Added quick jump to LinkedIn distribution panel from workflow card.
  - Auto-opens LinkedIn Power mode + advanced accordion when editor is opened with `panel=linkedin`.
  - Added visible LinkedIn snapshot cards (shares, queued items, latest impressions, URL readiness) so key status is visible without digging through advanced tools.
  - Updated advanced share log heading to include current article context (`Recent Shares for …`).

## Change Log (Feb 10, 2026 - Homepage CTA + News Carousel)
- **Hero CTA** (`src/components/LawFirmHomepage.tsx`):
  - Replaced hero contact link text action with an explicit button action (`type="button"`) that smoothly scrolls to the Contact section.
  - Applied in both hero templates (`classic` and `split`) to keep behavior consistent.
- **News Carousel Autoplay** (`src/components/BlogCarousel.tsx`):
  - Changed autoplay behavior from pixel-tick scrolling to card-step shifting so the carousel advances article-by-article.
  - Added slow autoplay defaults (`6000ms`) with runtime safety clamp (`>=3000ms`).
  - Preserved hover pause and manual arrow controls; manual navigation now resumes autoplay after a short delay.
- **News Admin Controls Alignment** (`src/components/admin/NewsSettingsManager.tsx`):
  - Updated defaults and input ranges for slower readable autoplay (`1000-20000ms`, default `6000ms`).
  - Updated labels/help text to reflect article-step carousel behavior and optional pixel override.

## Change Log (Feb 10, 2026 - Usage Daily + LinkedIn Metrics Reliability)
- **AI Usage Trends** (`src/components/admin/AIUsageStats.tsx`):
  - Added a daily token/cost breakdown panel for the last 14 days.
  - Kept monthly breakdown and moved both into scrollable side-by-side trend columns.
  - Updated trend copy to explicitly communicate daily + monthly visibility.
- **LinkedIn Analytics Coverage** (`src/app/api/linkedin/analytics/route.ts`, `src/app/api/linkedin/logs/route.ts`):
  - Added merged metrics retrieval for both member and organization posts via `socialActions` + organization share statistics.
  - Added clearer analytics notes for missing scopes (`r_member_social`, org scopes) and short post-publish metric propagation delays.
  - Increased advanced analytics log scan window in settings from 20 to 50 successful shares.
  - Removed UI gating in `src/components/admin/LinkedInSettings.tsx` so metric sync can run for personal posts even when org scopes/default org are not configured.
- **LinkedIn API Version Maintenance** (`src/lib/linkedinMetrics.ts`, `src/app/api/linkedin/organizations/route.ts`):
  - Replaced hardcoded older LinkedIn API version headers with `LINKEDIN_API_VERSION` override support and default `202601`.
  - This prevents silent metric loss tied to sunsetted version headers.

## Change Log (Feb 10, 2026 - Homepage UX Polish Pass)
- **Hero CTA Affordance** (`src/app/globals.css`, `src/components/LawFirmHomepage.tsx`):
  - Added concrete `btn-accent` styling so CTA actions render as real buttons (not text-only links).
  - Hero CTA keeps semantic button behavior and now has stronger visual affordance.
- **News Carousel Friction Reduction** (`src/components/BlogCarousel.tsx`, `src/app/globals.css`):
  - Hidden horizontal scrollbar while preserving swipe/arrow scrolling.
  - Slowed autoplay baseline and delayed post-manual-scroll resume for calmer pacing.
- **Map Hover Label Scale Fix** (`src/components/GlobalNetworkSection.tsx`):
  - Rebalanced city hover label scaling relative to zoom level to prevent oversized tooltip text.
- **Services Section Visual Refresh** (`src/components/LawFirmHomepage.tsx`):
  - Added prominent service image stage with active service title.
  - Service cards now preview image context on hover/focus and drive image switching directly.
- **Team Section Design Refresh** (`src/components/LawFirmHomepage.tsx`):
  - Added section depth (gradients, glow accents), refined card treatment, and improved hierarchy/typography for member cards.
- **Spirograph Layering** (`src/components/Spirograph.tsx`, `src/components/LawFirmHomepage.tsx`):
  - Raised spirograph layer and adjusted section stacking so animation remains visible into the Services transition area.

## Change Log (Feb 10, 2026 - Brand-Aligned CTA Refinement)
- **Button Styling Realignment** (`src/app/globals.css`):
  - Replaced gradient-heavy `btn-accent` treatment with a brand-faithful solid indigo CTA style.
  - Updated button geometry to cleaner rounded-rectangle form and reduced effects for a more serious/elite tone.
  - Focus ring now uses mint accent for contrast while keeping primary button chroma anchored in indigo.

## Change Log (Feb 10, 2026 - Node 22 Upgrade Hardening)
- **Runtime Version Pinning**:
  - Updated Netlify build runtime pin from Node 20 to Node 22 in `netlify.toml`.
  - Added package-level engine guard in `package.json` (`"engines": { "node": "22.x" }`).
  - Added `.nvmrc` with `22` to align local/dev shells with deploy runtime.
- **Validation**:
  - Verified local production build passes on Node `v22.12.0`.
  - Verified `netlify build` passes with Next.js runtime plugin.
  - Published draft deploy for validation: `698b512a70706057961e733e`.
  - Published security patch draft deploy (`axios` override): `698b54c75bb41064118616c2`.
  - Promoted production deploy with Node 22 pinning: `698b52abc24c088a882630da`.
  - Promoted production deploy with `axios` security override: `698b55041f6cc6699853de6c`.
  - Confirmed draft responds on core routes (`/`, `/blog`, `/api/blog`).
  - Confirmed production responds on core routes (`/`, `/blog`, `/api/blog`).
- **Security Snapshot**:
  - Applied a non-breaking override to `axios@1.13.5` (transitive via `@tryghost/content-api`) to remove the `axios` advisory without major upgrades.
  - Remaining advisories after patch are tied to major-track upgrades (`react-simple-maps`/`d3-*`, `next` advisory range).
- **Scheduler Runtime Verification**:
  - Confirmed scheduler execution path works via `/api/linkedin/run-scheduled` with scheduler secret (`200`, `processed: 0` when no due queue items).
  - Direct browser hits to `/.netlify/functions/linkedin-scheduler` return Netlify internal error pages in production context and are not the supported invocation path for scheduled functions.

## Change Log (Feb 10, 2026 - Security Hardening Phase 2)
- **Dependency Hardening**:
  - Removed unused `react-simple-maps` and `@types/react-simple-maps` dependencies from `package.json` (eliminates the transitive `d3-*` advisory chain).
  - Upgraded `next` from `^14.1.0` to `^15.5.12` (patched advisory range) and `@netlify/plugin-nextjs` from `^5.8.1` to `^5.15.8`.
  - Kept existing `axios` override (`^1.13.5`) in place.
- **Next 15 Compatibility Updates**:
  - Updated dynamic route typing for App Router API handlers (`src/app/api/blog/[slug]/route.ts`) to use async `params` context.
  - Updated App Router page params typing (`src/app/blog/[slug]/page.tsx`) to async `params`.
  - Migrated `headers()` usage to async request API in:
    - `src/app/blog/[slug]/page.tsx`
    - `src/app/blog/page.tsx`
    - `src/app/layout.tsx` (via async SEO base URL helper usage)
    - `src/lib/seoSettings.ts`
    - `src/app/api/analytics/event/route.ts`
    - `src/app/api/analytics/article-view/route.ts`
  - Removed deprecated Next config keys (`swcMinify`, `optimizeFonts`) and added `outputFileTracingRoot` in `next.config.js`.
  - Accepted Next-generated TypeScript route types reference update in `next-env.d.ts`.
- **Validation Results (Staging)**:
  - `npm audit --omit=dev`: `0 vulnerabilities`.
  - `npm run build`: pass on Next `15.5.12`.
  - `npx netlify build`: pass with Netlify Next runtime `v5.15.8`.
  - Draft deploy published: `698b57ed1b2aa200955598a6`.
  - Draft smoke checks pass on:
    - `/`
    - `/blog`
    - `/api/blog?limit=1`
    - `/api/linkedin/status` (returns expected auth-missing recoverable payload when unauthenticated).
- **Production Promotion + Smoke Validation**:
  - Production deploy published: `698b58771b2aa20081559998`.
  - Production smoke checks pass on:
    - `/`
    - `/blog`
    - `/api/blog?limit=1`
    - `/api/linkedin/status`
  - Scheduler execution path validated post-deploy via `/api/linkedin/run-scheduled` with `x-scheduler-secret` (`200`, `processed: 0` when no due jobs).

## Change Log (Feb 10, 2026 - Brand Guideline UI Pass: Services + Team)
- **Services Section** (`src/components/LawFirmHomepage.tsx`):
  - Removed section-level gradient and pattern overlays; section background is now transparent so the hero spirograph can remain visible underneath while rotating.
  - Kept content above the spirograph using higher section/content z-index without adding opaque section backgrounds.
  - Restyled headings/cards with brand-faithful palette from guidelines (`#210059`, `#5d00ff`, light lavender neutrals) and reduced decorative effects.
- **Team Section** (`src/components/LawFirmHomepage.tsx`):
  - Replaced gradient-heavy section treatment with clean solid brand-light backgrounds (`#f4f3ff` / `#f0f0ff`) and subtle indigo divider lines.
  - Simplified cards to white surfaces with indigo borders/shadows and top accent rules, avoiding diffuse glow gradients.
  - Updated typography and card accents to align with brand indigo hierarchy and cleaner enterprise tone.

## Change Log (Feb 19, 2026 - Gemini Article Generation Reliability + Reuse Guide)
- **Primary Finding**:
  - One-shot multilingual article generation (all languages in one large JSON response) is the main failure mode for parse instability, especially when grounding/tools are involved.
  - Gemini JSON repair can itself return invalid JSON; retry cascades can waste tokens quickly.

- **Reliability Architecture (Implemented)**:
  - Added bounded-generation flow in `src/lib/aiService.ts`:
    - One primary generation pass.
    - No unbounded re-generation loops on parse failures.
    - Low-cost fallback path to return usable content instead of hard-fail.
  - Added resilient parse/recovery behavior:
    - Candidate text extraction now reads all text parts (not only first part).
    - Recovery can produce a safe HTML fallback article from raw output.
    - Missing language fields are filled deterministically to avoid “sources-only” payloads.
  - Added multilingual stability mode:
    - For standard (non-custom-prompt) multilingual requests, generate one primary language first, then translate article package per language via structured JSON schema.
    - Merge translated fields + sources + usage metadata.
  - Added operator-facing recovery UX in AI Lab:
    - Preserve recoverable raw output.
    - Recover/preview/copy raw output after parse failures.
    - Persist recoverable output in localStorage for refresh safety.

- **Token Control Rules (Now Required)**:
  - Never run repeated model retries for the same generation event without a hard cap.
  - Prefer deterministic post-processing over new generation calls.
  - Use single-language generation + per-language translation for multilingual outputs to avoid oversized mixed JSON payloads.
  - Keep recovery path available so generated text is not lost if strict JSON parse fails.

- **Reusable Reference**:
  - See `docs/ai-content-pipeline-playbook.md` for the consolidated cross-feature implementation guide (Gemini articles, image generation, and LinkedIn publish/scheduling/metrics).
  - See `docs/gemini-article-generation-playbook.md` for article-generation-specific reliability internals.

- **Prompt Governance (Admin-Editable Defaults)**:
  - Added admin-editable default prompt settings in `AI Settings` so teams can tune writing voice without code changes:
    - `gemini_article_prompt_default_instructions`
    - `gemini_article_prompt_slovak_native_instructions`
    - `gemini_translation_prompt_default_instructions`
  - Added production default values for all three keys and runtime fallback wiring so generation uses them even when settings rows are missing.
  - Runtime wiring applies these defaults to:
    - primary article generation prompt
    - multilingual translation prompt pipeline
  - AILab prompt preview/reset now includes these defaults so operators can see the effective prompt before dispatch.

## Change Log (Feb 19, 2026 - Consolidated AI Pipeline Documentation)
- Added `docs/ai-content-pipeline-playbook.md` as the primary reusable reference for future projects.
- Includes end-to-end documentation for:
  - Article generation reliability architecture (multilingual + parse recovery).
  - Image generation architecture (Turbo + Gemini/Imagen fallback chain).
  - LinkedIn distribution architecture (OAuth, direct share, queue scheduling, cron runner, and metrics sync).
- Added explicit portability checklists:
  - Required settings keys and env vars.
  - Supabase SQL bootstrap order.
  - API surface summary and migration checklist.

## Change Log (Feb 19, 2026 - Settings Stats + LinkedIn Reliability Audit)
- Added targeted implementation/validation guide:
  - `docs/settings-stats-linkedin-implementation.md`
- Correctness fixes shipped:
  - Preflight token/cost estimation now scales for multilingual generation + translation overhead in `src/components/admin/AILab.tsx`.
  - Generation summary API now counts deduped generation requests (filters `action=generate_article`, groups by `request_id`) in `src/app/api/admin/ai-generation-summary/route.ts`.
  - Monthly usage panel now enforces last-12-month window in `src/components/admin/AIUsageStats.tsx`.
  - LinkedIn share and scheduled runner now resolve site URL with robust env fallback chain in:
    - `src/app/api/linkedin/share/route.ts`
    - `src/app/api/linkedin/run-scheduled/route.ts`
