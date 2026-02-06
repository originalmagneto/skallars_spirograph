# ROADMAP (Reset Pass) - Admin UX, CMS Dedupe, AI Control

Last updated: Feb 6, 2026

## 0) Why This Reset

The admin currently works, but it is still hard to operate:
- too many controls shown at once (especially Article + Image + model settings)
- overlapping CMS editing surfaces (generic content vs module-specific managers)
- inconsistent panel density and layout patterns across modules
- recurring reliability noise (role-check timeouts, non-blocking API errors)

This roadmap prioritizes **clarity and consistency first**, then deeper capabilities.

---

## 1) Product Direction (Locked)

- Keep power-user controls, but hide them behind clear progressive disclosure.
- Default UX must be understandable in under 30 seconds.
- Preserve stable systems:
  - map cities coordinate logic
  - hero spirograph
- LinkedIn flow stays in product; company posting remains a required path.

---

## 2) Current Admin Audit Summary

## Confirmed strengths
- Workspace split (`Site Editor` vs `Publishing & AI`) exists and is directionally correct.
- Article Studio flow (`Generate -> Edit & Publish`) exists.
- Shared admin primitives are already partially adopted.

## Main problems to fix next
- **CMS overlap**:
  - `ContentManager` and module managers can both control related content zones.
  - ownership boundaries are not explicit.
- **Settings sprawl**:
  - global AI settings vs article-specific settings vs LinkedIn settings are mixed.
- **UI density inconsistency**:
  - some panels are bento/compact, others are stretched full-width forms.
- **Reliability friction**:
  - transient role timeout and API fallback noise still leaks into UX.

---

## 3) Phase Plan (Next Execution)

## Phase 1 - Stabilize + Remove Noise (Immediate)
Goal: eliminate recurring false-error states and unblock smooth daily use.

Deliverables:
- [x] unify role check path (single source + consistent timeout/retry behavior)
- [x] remove non-critical red toasts for expected fallback responses
- [x] normalize settings fetches to tolerant patterns (no strict-single where optional)
- [x] add lightweight admin health banner for actionable errors only

Progress notes (current pass):
- Auth startup timeout increased and role-fetch deduplicated in `AuthContext` to reduce false permission screens.
- LinkedIn organization fallback errors are now shown inline (non-blocking) instead of repeated destructive toasts.
- Admin shell now shows a lightweight warning banner only when role verification degrades, with retry and dismiss actions.
- Production build passes locally after this pass.

Exit criteria:
- no repeated `Profile role check timed out` during normal admin usage
- no blocking UX from recoverable `400/406` settings/org endpoints
- diagnostics are manual, not auto-intrusive

---

## Phase 2 - CMS Ownership Dedupe (High Impact)
Goal: one obvious place to edit each type of website content.

Deliverables:
- [x] define and implement ownership matrix:
  - `ContentManager`: global copy and shared text keys only
  - module managers: structured entities only (team, clients, services, footer links, etc.)
- [x] remove or hide duplicate fields where module manager is canonical
- [x] add inline “source of truth” labels in editors

Progress notes (current pass):
- Added section-level ownership guidance in `ContentManager`.
- Added direct “Open <Manager>” links from copy sections to their canonical structured managers.
- Added structured-key ownership detection in `ContentManager` and hidden-by-default rendering with a “Show structured keys” power toggle.
- Added legacy duplicate-key pattern detection for Services/Team/Clients/Footer/Map legacy content keys and mapped each to its canonical manager.
- Updated section item counters to reflect visible keys only (avoids inflated counts from hidden structured duplicates).
- Added source-of-truth hint cards to Services, Team, Clients, and Footer managers.
- Completed key-by-key cleanup pass for legacy structured duplicates.

Exit criteria:
- no user-visible duplicate edit pathways for same field
- each section has one canonical edit surface

---

## Phase 3 - Publishing UX Simplification (Article + Image)
Goal: make Article Studio simple by default, powerful when expanded.

Deliverables:
- [x] enforce `Simple` and `Power` modes consistently across:
  - article generation
  - outline workflow
  - image generation controls
- move advanced controls into grouped accordions:
  - model/thinking budget
  - prompt internals
  - grounding detail
- simplify first-run defaults:
  - strong default model
  - sane thinking budget
  - lite image mode default

Progress notes (current pass):
- `AILab` now force-resets advanced controls when switching to `Basic` mode (`custom prompt`, `outline workflow`, `power controls`).
- `AILab` now keeps source-link editor hidden in `Basic` mode unless explicitly toggled on (default is off).
- `Power` mode auto-enables source-link editing to preserve full control workflow.
- Advanced controls in `AILab` were regrouped into compact cards (word count, tone, outline, prompt) to reduce long-form scrolling and make power settings easier to scan.

Exit criteria:
- average user can generate + save draft + publish without opening Power mode
- power user can still override model, thinking budget, prompt and image model

---

## Phase 4 - Unified Settings IA + Bento Density Pass
Goal: settings pages feel coherent and scannable.

Deliverables:
- split settings into explicit groups:
  - AI Providers (global)
  - Article Generation Defaults
  - Image Generation Defaults
  - LinkedIn Distribution
  - SEO/Metadata
- apply compact two-column bento cards where fields are short
- keep long-form text fields full-width only where needed

Exit criteria:
- no stretched one-field rows for short controls
- settings visually consistent with same card/action patterns

Progress notes (current pass):
- `AISettings` moved to a denser 12-column bento layout.
- Image settings split into two focused cards:
  - `Image Studio Mode`
  - `Image Advanced Configuration`
- Short controls now sit in smaller cards instead of one full-width stretched panel.

---

## Phase 5 - LinkedIn System Polish
Goal: stable personal/company sharing with clear state.

Deliverables:
- finalize default organization strategy:
  - saved default org URN in settings
  - clear fallback when discovery endpoints fail
- add explicit share-state indicators on articles:
  - not shared / shared personal / shared company / scheduled
- analytics panel quality pass:
  - clear “available vs unavailable due to scope/API” states

Note:
- if LinkedIn link preview image is still inconsistent, treat as platform behavior unless OpenGraph fetch path is proven broken.

Exit criteria:
- company-page flow works without manual URN entry per article
- editor shows last share status at article level

Progress notes (current pass):
- Article Editor no longer hard-blocks company shares when org picker is empty; API fallback can resolve saved default org URN.
- LinkedIn basic mode now auto-resolves share type (image+link when cover image exists, otherwise link).
- LinkedIn Settings now loads analytics only in `Power` mode to reduce unnecessary API noise in normal operation.
- Article list now shows explicit LinkedIn state (`Not shared`, `Scheduled`, `Shared`) with target context.

---

## Phase 6 - AI Governance (Budgets, Limits, Quotas)
Goal: control cost/perf without hurting UX.

Deliverables:
- [x] add per-request budget guardrails in Article Studio
- [x] add daily/monthly quota policy settings (admin-level)
- [x] add rate-limit UX messaging (friendly, precise, no stack traces)
- usage dashboard rollup by user/model/action

Progress notes (current pass):
- Added `gemini_request_budget_usd` support directly in Article Studio power controls.
- Added live preflight request-cost estimate (derived from prompt, word count, depth, thinking budget, and configured token pricing).
- Added hard pre-dispatch guard: generation is blocked when estimated request cost exceeds cap, with actionable UX message.
- Article Studio persists request cap with article model/thinking budget settings.
- Added global quota controls in AI Settings: daily/monthly token quotas, daily/monthly USD quotas, and request cooldown.
- Added pre-dispatch quota checks in Article Studio with explicit, user-readable limit messages (daily/monthly token and USD projections).
- Added client-side request cooldown enforcement with clear remaining-wait feedback.

Exit criteria:
- budget overruns are prevented before request dispatch
- quota breaches are clear and recoverable

---

## 4) UX Rules To Enforce Across Admin

- one primary action per panel (others secondary/ghost)
- max 5 controls visible in default mode before “Advanced”
- consistent card header anatomy: title, short description, right-aligned actions
- avoid mixed navigation patterns inside same workspace
- do not surface low-level provider details unless in Power mode

---

## 5) Testing Strategy Per Phase

- Functional smoke:
  - site editing flow (save, publish, frontend reflect)
  - article flow (generate, outline, draft, edit, publish)
  - LinkedIn flow (connect, share personal/company, status update)
- UX smoke:
  - first-run path without docs
  - power-user override path
- Reliability:
  - slow network simulation
  - missing optional settings rows
  - degraded LinkedIn endpoints

---

## 6) Execution Order (Recommended)

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6

---

## 7) Immediate Next Step

Start Phase 1 with a focused bug/noise sweep:
- role-check timeout handling
- tolerant settings/org fetch cleanup
- non-blocking fallback message normalization
