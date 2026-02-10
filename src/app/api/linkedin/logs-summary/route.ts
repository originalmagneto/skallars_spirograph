import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  emptyLinkedInMetrics,
  fetchOrganizationShareMetrics,
  fetchSocialActionMetrics,
  getOrgUrnFromShareLog,
  getUrnFromShareLog,
  isMissingColumnError,
  mergeLinkedInMetrics,
} from '@/lib/linkedinMetrics';
import type { LinkedInInteractionMetrics } from '@/lib/linkedinMetrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids') || '';
    const ids = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ summaries: [] });
    }

    const buildLogsQuery = (selectClause: string) =>
      supabase
        .from('linkedin_share_logs')
        .select(selectClause)
        .eq('user_id', userData.user.id)
        .eq('status', 'success')
        .in('article_id', ids)
        .order('created_at', { ascending: false })
        .limit(300);

    const buildScheduledQuery = (selectClause: string) =>
      supabase
        .from('linkedin_share_queue')
        .select(selectClause)
        .eq('user_id', userData.user.id)
        .in('article_id', ids)
        .in('status', ['scheduled', 'retry', 'processing'])
        .order('scheduled_at', { ascending: true })
        .limit(300);

    let hasLogShareMode = true;
    let { data: logsData, error: logsError } = await buildLogsQuery(
      'article_id, share_url, created_at, share_target, share_mode, provider_response'
    );
    if (logsError && isMissingColumnError(logsError, 'share_mode')) {
      hasLogShareMode = false;
      const fallbackLogs = await buildLogsQuery(
        'article_id, share_url, created_at, share_target, provider_response'
      );
      logsData = fallbackLogs.data;
      logsError = fallbackLogs.error;
    }
    if (logsError) throw logsError;

    let { data: scheduledRows, error: scheduledError } = await buildScheduledQuery(
      'article_id, status, scheduled_at, share_target, share_mode'
    );
    if (scheduledError && isMissingColumnError(scheduledError, 'share_mode')) {
      const fallbackScheduled = await buildScheduledQuery(
        'article_id, status, scheduled_at, share_target'
      );
      scheduledRows = fallbackScheduled.data;
      scheduledError = fallbackScheduled.error;
    }
    if (scheduledError) throw scheduledError;

    const logs = (logsData || []) as unknown as Array<{
      article_id: string;
      share_url: string | null;
      created_at: string;
      share_target: string | null;
      share_mode?: string | null;
      provider_response?: any;
    }>;

    const latestByArticle = new Map<
      string,
      {
        article_id: string;
        share_url: string | null;
        last_shared_at: string;
        share_target: string | null;
        share_mode: string | null;
        scheduled_at: string | null;
        scheduled_status: string | null;
        scheduled_share_target: string | null;
        metrics: LinkedInInteractionMetrics | null;
      }
    >();
    logs.forEach((row: any) => {
      if (!row?.article_id || latestByArticle.has(row.article_id)) return;
      latestByArticle.set(row.article_id, {
        article_id: row.article_id,
        share_url: row.share_url || null,
        last_shared_at: row.created_at,
        share_target: row.share_target || null,
        share_mode: hasLogShareMode ? row.share_mode || null : null,
        scheduled_at: null,
        scheduled_status: null,
        scheduled_share_target: null,
        metrics: null,
      });
    });

    (scheduledRows || []).forEach((row: any) => {
      if (!row?.article_id) return;
      const existing = latestByArticle.get(row.article_id);
      if (existing) {
        if (!existing.scheduled_at) {
          existing.scheduled_at = row.scheduled_at || null;
          existing.scheduled_status = row.status || null;
          existing.scheduled_share_target = row.share_target || null;
        }
        return;
      }
      latestByArticle.set(row.article_id, {
        article_id: row.article_id,
        share_url: null,
        last_shared_at: '',
        share_target: null,
        share_mode: null,
        scheduled_at: row.scheduled_at || null,
        scheduled_status: row.status || null,
        scheduled_share_target: row.share_target || null,
        metrics: null,
      });
    });

    const latestSharedRowsByArticle = new Map<string, (typeof logs)[number]>();
    logs.forEach((row) => {
      if (!row.article_id || latestSharedRowsByArticle.has(row.article_id)) return;
      latestSharedRowsByArticle.set(row.article_id, row);
    });

    const urnByArticle = new Map<string, string>();
    latestSharedRowsByArticle.forEach((row, articleId) => {
      const urn = getUrnFromShareLog(row);
      if (urn) urnByArticle.set(articleId, urn);
    });

    const allUrns = Array.from(new Set(urnByArticle.values()));
    if (allUrns.length > 0) {
      const { data: accountRows } = await supabase
        .from('linkedin_accounts')
        .select('access_token, scopes')
        .eq('user_id', userData.user.id)
        .limit(1);
      const account = accountRows?.[0];

      if (account?.access_token) {
        try {
          const socialMetricsByUrn = await fetchSocialActionMetrics(account.access_token, allUrns);
          const orgMetricsByUrn = new Map<string, Partial<LinkedInInteractionMetrics>>();
          const scopes = Array.isArray(account.scopes)
            ? account.scopes
            : typeof account.scopes === 'string'
            ? account.scopes.split(/[\s,]+/).filter(Boolean)
            : [];
          const hasOrgScope =
            scopes.includes('r_organization_social') || scopes.includes('w_organization_social');

          if (hasOrgScope) {
            const urnsByOrg = new Map<string, string[]>();
            latestSharedRowsByArticle.forEach((row, articleId) => {
              if (row.share_target !== 'organization') return;
              const urn = urnByArticle.get(articleId);
              if (!urn) return;
              const orgUrn = getOrgUrnFromShareLog(row);
              if (!orgUrn) return;
              const current = urnsByOrg.get(orgUrn) || [];
              current.push(urn);
              urnsByOrg.set(orgUrn, current);
            });

            for (const [orgUrn, urns] of urnsByOrg.entries()) {
              const metrics = await fetchOrganizationShareMetrics(
                account.access_token,
                orgUrn,
                Array.from(new Set(urns))
              );
              metrics.forEach((value, urn) => {
                orgMetricsByUrn.set(urn, value);
              });
            }
          }

          urnByArticle.forEach((urn, articleId) => {
            const summary = latestByArticle.get(articleId);
            if (!summary) return;
            const merged = mergeLinkedInMetrics(
              mergeLinkedInMetrics(emptyLinkedInMetrics(), socialMetricsByUrn.get(urn) || null),
              orgMetricsByUrn.get(urn) || null
            );
            const hasMetrics = Object.values(merged).some((value) => value !== null);
            summary.metrics = hasMetrics ? merged : null;
            latestByArticle.set(articleId, summary);
          });
        } catch {
          // Keep summary state usable even when LinkedIn metrics APIs are degraded.
        }
      }
    }

    return NextResponse.json({ summaries: Array.from(latestByArticle.values()) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load LinkedIn share summary.' }, { status: 500 });
  }
}
