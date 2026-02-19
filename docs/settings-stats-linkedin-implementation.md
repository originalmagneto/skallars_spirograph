# Settings Stats + LinkedIn Implementation Guide

Last updated: Feb 19, 2026

## Scope
This document covers:
- AI usage stats in the Settings panel
- per-article cost estimation and quota gating in Article Studio
- LinkedIn integration reliability (direct share + scheduled share paths)
- practical validation steps to confirm behavior in a live environment

## 1) AI Usage Stats: How It Works

### Data sources
- Usage logs: `public.ai_usage_logs`
- Generation event logs: `public.ai_generation_logs`
- Pricing + quota settings: `public.settings` via `fetchAISettings()`

Primary UI:
- `src/components/admin/AIUsageStats.tsx`

Generation summary API:
- `src/app/api/admin/ai-generation-summary/route.ts`

### Cost calculation model
For each usage row:
- `cost = (input_tokens / 1_000_000) * price_input_per_million + (output_tokens / 1_000_000) * price_output_per_million`

The settings panel computes:
- total cost/tokens/requests
- today and month rollups
- model and action rollups

### Important correction applied
`ai-generation-summary` now measures real generation attempts, not raw event rows:
- filters only `action = generate_article`
- groups by `request_id` and keeps latest status per request

Why:
- previously, `started` and terminal rows were both counted, inflating totals
- non-generation events (for example `ai_lab_save_draft`) polluted counters

## 2) Per-Article Cost Estimation: How It Works

Primary UI:
- `src/components/admin/AILab.tsx`

### Current estimation path
`estimateRequestTokens()` computes preflight token estimates and drives:
- request cap checks (`gemini_request_budget_usd`)
- projected quota checks (daily/monthly token + USD)
- preflight cost display

### Important correction applied
Preflight estimation now accounts for multilingual architecture:
- primary generation call
- one translation call per additional language
- deep research pre-pass overhead when `researchMode = deep`

Why:
- previous model under-estimated multilingual requests, especially for `SK + EN + DE + CN`
- this could understate projected USD and allow quota/cap bypasses

### Estimation logic (implemented)
- Primary prompt tokens: based on composed prompt length
- Primary output tokens: based on target word count + workflow overhead
- Translation input/output per additional language:
  - input per language ~ `0.6 * primary_output + constant`
  - output per language ~ `0.9 * primary_output`
- Deep mode adds a research pre-pass estimate

This intentionally errs slightly conservative to reduce token-spend surprises.

## 3) LinkedIn Integration: How It Works

### Core routes
- Auth/connect: `/api/linkedin/auth`, `/api/linkedin/callback`, `/api/linkedin/disconnect`
- Share now: `/api/linkedin/share`
- Schedule share: `/api/linkedin/schedule`
- Execute queue: `/api/linkedin/run-scheduled`
- Status and diagnostics: `/api/linkedin/status`, `/api/linkedin/organizations`, `/api/linkedin/logs`, `/api/linkedin/scheduled`, `/api/linkedin/analytics`, `/api/linkedin/logs-summary`

### Important correction applied
Site URL resolution is now robust in share and scheduled-run paths:
- uses fallback chain:
  - `NEXT_PUBLIC_SITE_URL`
  - `URL`
  - `DEPLOY_PRIME_URL`
  - `DEPLOY_URL`
  - `SITE_URL`
  - request origin fallback

Updated files:
- `src/app/api/linkedin/share/route.ts`
- `src/app/api/linkedin/run-scheduled/route.ts`

Why:
- scheduled share link construction previously depended only on `NEXT_PUBLIC_SITE_URL`
- missing env could produce invalid/missing article URLs in queue execution

## 4) Required Settings and Env Keys

### Settings keys (minimum for this scope)
- `gemini_price_input_per_million`
- `gemini_price_output_per_million`
- `gemini_request_budget_usd`
- `gemini_quota_daily_tokens`
- `gemini_quota_monthly_tokens`
- `gemini_quota_daily_usd`
- `gemini_quota_monthly_usd`
- `gemini_request_cooldown_seconds`
- `linkedin_default_org_urn`

### LinkedIn env keys
- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`
- `LINKEDIN_SCHEDULER_SECRET`
- `LINKEDIN_ENABLE_ORG_SCOPES`
- `LINKEDIN_ENABLE_MEMBER_READ_SCOPE`
- `LINKEDIN_API_VERSION`
- one of: `NEXT_PUBLIC_SITE_URL`, `URL`, `DEPLOY_PRIME_URL`, `DEPLOY_URL`, `SITE_URL`

## 5) Validation Checklist (Live)

Use this to confirm production behavior end-to-end.

### A. Cost estimation and quota gating
1. Set pricing in AI Settings:
   - input + output USD per million tokens.
2. Set a low request cap (for example `$0.01`).
3. Configure multilingual generation (`SK + EN + DE`).
4. Increase target length to make estimate high.
5. Expected:
   - preflight estimate appears
   - request blocks when estimated cost exceeds cap
   - block message includes estimated cost and cap
6. Lower length or remove languages and retry.
7. Expected:
   - request proceeds
   - post-generation token usage and estimated cost appear
8. Verify `ai_usage_logs` row is written for successful generation.

### B. Settings stats integrity
1. Open Settings -> Usage & Tracking.
2. Compare KPI counts with DB:
   - `ai_usage_logs` count for usage entries
   - generation summary count for real requests
3. Expected:
   - tracked generation count matches deduped request count
   - monthly panel shows max 12 months
4. Verify daily/monthly token and cost rollups match DB windows.

### C. LinkedIn direct share
1. Connect LinkedIn account.
2. Confirm `status` shows connected + scopes.
3. Share one article as member target.
4. Expected:
   - `/api/linkedin/share` success
   - `linkedin_share_logs` success row present
   - post URL visible in logs

### D. LinkedIn organization share
1. Enable org scopes and reconnect.
2. Set default org URN in LinkedIn Settings.
3. Share as organization.
4. Expected:
   - success row with `share_target = organization`
   - no "org scopes missing" error

### E. Scheduled share and runner
1. Schedule a post from Article Editor.
2. Confirm queue row exists in `linkedin_share_queue` with `status = scheduled`.
3. Trigger runner:
   - manually: `/api/linkedin/run-scheduled` with auth
   - or cron path through Netlify function
4. Expected:
   - queue row transitions to `processing` then `success`/`error`
   - success writes `linkedin_share_logs` row
   - `share_url` appears for successful share

## 6) Code Integration Steps (Port to Another Project)

1. Copy these files:
   - `src/components/admin/AIUsageStats.tsx`
   - `src/components/admin/AILab.tsx`
   - `src/app/api/admin/ai-generation-summary/route.ts`
   - `src/app/api/linkedin/share/route.ts`
   - `src/app/api/linkedin/run-scheduled/route.ts`
   - plus full LinkedIn route set under `src/app/api/linkedin/*`
2. Ensure SQL is applied for:
   - `ai_usage_logs`, `ai_generation_logs`
   - `linkedin_schema`, `linkedin_share_queue`, queue/log upgrades
3. Ensure scheduler wiring exists:
   - `netlify/functions/linkedin-scheduler.ts`
   - `netlify.toml` schedule entry
4. Configure settings keys and env vars.
5. Run validation checklist above before production rollout.

## 7) Current Verification Status

Completed in this repo:
- static code audit of stats, estimation, and LinkedIn routes
- fixes applied for:
  - multilingual preflight estimation undercount
  - generation summary overcount/noise
  - LinkedIn URL resolution fragility in share/scheduled paths
- `npm run build` passes after changes

Pending for full runtime sign-off:
- live LinkedIn OAuth/share/schedule execution against real credentials
- live quota/cap scenario tests against your production settings and usage data
