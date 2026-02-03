# Roadmap: Admin Panel (Content-First) + AI Adjustments

This roadmap is based on the current codebase, the UI vs functionality audit, and your stated priorities.

**Status (Feb 3, 2026)**
- Phase 0 complete.
- Phase 1 (text-first editing) complete.
- Phase 1 media tools moved to Phase 2 (you said no image fields right now).

## Phase 0: Fix UI vs Functionality Mismatches (Immediate)
- Wire **admin content edits to the actual frontend** (replace or augment `translations.ts` with Supabase content for public pages). ✅
- Fix **Article Editor copy** (“Markdown” vs HTML) or implement a true rich editor that matches output. ✅
- Persist **Map Display Settings** (store in Supabase or localStorage) so “saved automatically” is true. ✅
- Preserve **Team Member photo positioning** when editing. ✅
- Implement **image batch generation** honoring `image_count` or remove the setting. ✅
- Update **AI Usage cost estimates** to reflect selected model or remove the estimate if unknown. ✅

## Phase 1: Content System Foundation (Text-First, Core Admin UX)
- Create a **content model registry** to define editable sections, fields, and field types. ✅
- Connect this registry to **public pages** and migrate existing `translations.ts` strings into Supabase content. ✅
- Provide **preview modes** for each section and a full-page preview in admin. ✅
- Add **draft vs published** state with per-item and per-section publish actions. ✅
- Add **role-aware editing**: editors can propose changes, admins publish. ✅
- Extend **Team Members** with bio + icon fields for richer text-only profiles. ✅
- Add **admin preview bar** with section highlights and deep links into Content Manager. ✅

## Phase 2: Full-Fidelity Page Editing
- Implement a **page/section editor** (block-based) to edit homepage and key pages without code.
- Add **layout control** for homepage section order + visibility (Phase 2 kickoff). ✅
- Add **Services block list** (reorder + enable/disable + multilingual titles/descriptions). ✅
- Add **News block settings** (limit, autoplay speed, show/hide View All). ✅
- Add **Clients block settings** (visible logos + autoplay speed). ✅
- Add **Team block settings** (columns + show/hide icons, bios, LinkedIn). ✅
- Add **Footer block settings** (show/hide contact, solutions, newsletter, social). ✅
- Add **Countries block settings** (controls, labels, stats, default view). ✅
- Add **Footer links manager** (solutions + social URLs, multilingual labels). ✅
- Add **Homepage blocks** (callout block type + layout integration). ✅
- Add **Block templates** (testimonials + FAQ with item editor). ✅
- Add **drag-and-drop ordering** inside Blocks (items list). ✅
- Make **Services sticky images** editable via content overrides (non-hero). ✅
- Make **Contact image** editable via content overrides (footer contact block). ✅
- Support **reorderable blocks** and **section templates** (Hero, Services, Team, Testimonials, Contact).
- Add **multilingual editing UX** with side-by-side view and translation helpers.
- Add **live preview** with “before/after” diff for reviewers.
- Add **SEO editor** (meta title/desc, OpenGraph, structured data) per page.

## Phase 2.1: Media + History (Moved from Phase 1)
- Introduce **media library** with tags + search for all images. ✅
- Add **image upload tools** for `site_content` graphics and section assets (crop later). ✅
- Add **content history** (versioning + restore) for published `site_content`. ✅
- Add **crop tools** (square + landscape) for Team/Clients/Content image fields. ✅
- Allow **Team + Clients** to pick images from the Media Library. ✅

## Phase 3: AI Article Studio (Targeted Adjustments)
- Add **research mode** controls: Quick vs Deep with clear time/quality tradeoff.
- Improve **sources panel**: show citations inline and in a dedicated references block.
- Add **voice & tone controls** (formal legal memo, client-friendly, news brief).
- Add **length control** slider with target word count and estimated cost/time.
- Add **outline-first workflow**: generate outline, approve, then generate full draft.
- Add **editorial tools**: rewrite sections, expand/shorten, simplify.
- Add **fact-check checklist** and **legal compliance disclaimer** blocks.

## Phase 4: AI Image Studio (Only After Content Editing Is Strong)
- Create a dedicated **Image Studio** with prompt builder, styles, and aspect ratio presets.
- Add **batch generation** with previews, history, and comparisons.
- Add **in-app editor** (crop, focal point, color adjustments, text overlay).
- Add **template-based social images** for blog and announcements.
- Store **generation metadata** (prompt, model, seed) and allow regeneration.

## Phase 5: Publishing Workflow + Analytics
- Add **approval workflow** (review, approve, publish, schedule).
- Add **scheduled publishing** and **content calendars**.
- Add **engagement analytics** for articles and content blocks.
- Add **audit logs** for admin actions and AI usage.

## Enablers and Infrastructure
- Define **Supabase schema migrations** for new content blocks, media metadata, revisions, and AI research logs.
- Add **RLS policies** for admin/editor/user roles.
- Add **rate limits** and **usage quotas** for AI generation.
- Add **per-article budget controls** (token caps and cost estimates).
