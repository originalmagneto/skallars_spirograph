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
    const articleId = searchParams.get('articleId');
    const includeMetrics = searchParams.get('includeMetrics') === '1';

    const buildQuery = (selectClause: string) => {
      let query = supabase
        .from('linkedin_share_logs')
        .select(selectClause)
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (articleId) {
        query = query.eq('article_id', articleId);
      }
      return query;
    };

    let logsSelect =
      'id, status, share_target, visibility, share_url, error_message, created_at, provider_response, share_mode';
    let { data, error } = await buildQuery(logsSelect);
    let hasShareMode = true;

    if (error && isMissingColumnError(error, 'share_mode')) {
      hasShareMode = false;
      logsSelect =
        'id, status, share_target, visibility, share_url, error_message, created_at, provider_response';
      const fallback = await buildQuery(logsSelect);
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    const rows = (data || []) as unknown as Array<{
      id: string;
      status: string;
      share_target: string | null;
      share_mode?: string | null;
      visibility: string | null;
      share_url: string | null;
      error_message: string | null;
      created_at: string;
      provider_response?: any;
    }>;

    if (!includeMetrics) {
      return NextResponse.json({
        logs: rows.map((row) => ({
          id: row.id,
          status: row.status,
          share_target: row.share_target,
          share_mode: hasShareMode ? row.share_mode || null : null,
          visibility: row.visibility,
          share_url: row.share_url,
          error_message: row.error_message,
          created_at: row.created_at,
        })),
      });
    }

    const successRows = rows.filter((row) => row.status === 'success');
    const urnByLogId = new Map<string, string>();
    successRows.forEach((row) => {
      const urn = getUrnFromShareLog(row);
      if (urn) urnByLogId.set(row.id, urn);
    });

    const urns = Array.from(new Set(urnByLogId.values()));
    let socialMetricsByUrn = new Map<string, Partial<LinkedInInteractionMetrics>>();
    let orgMetricsByUrn = new Map<string, Partial<LinkedInInteractionMetrics>>();
    let metricsNote: string | null = null;

    if (urns.length > 0) {
      const { data: accountRows } = await supabase
        .from('linkedin_accounts')
        .select('access_token, scopes')
        .eq('user_id', userData.user.id)
        .limit(1);
      const account = accountRows?.[0];

      if (account?.access_token) {
        socialMetricsByUrn = await fetchSocialActionMetrics(account.access_token, urns);

        const scopes = Array.isArray(account.scopes)
          ? account.scopes
          : typeof account.scopes === 'string'
          ? account.scopes.split(/[\s,]+/).filter(Boolean)
          : [];
        const hasOrgScope =
          scopes.includes('r_organization_social') || scopes.includes('w_organization_social');

        if (hasOrgScope) {
          const urnsByOrg = new Map<string, string[]>();
          successRows.forEach((row) => {
            if (row.share_target !== 'organization') return;
            const urn = urnByLogId.get(row.id);
            if (!urn) return;
            const orgUrn = getOrgUrnFromShareLog(row);
            if (!orgUrn) return;
            const current = urnsByOrg.get(orgUrn) || [];
            current.push(urn);
            urnsByOrg.set(orgUrn, current);
          });

          for (const [orgUrn, orgUrns] of urnsByOrg.entries()) {
            const metrics = await fetchOrganizationShareMetrics(
              account.access_token,
              orgUrn,
              Array.from(new Set(orgUrns))
            );
            metrics.forEach((value, urn) => {
              orgMetricsByUrn.set(urn, value);
            });
          }
        } else {
          metricsNote =
            'Organization detail metrics are unavailable because org scopes are missing.';
        }
      } else {
        metricsNote = 'LinkedIn account is not connected. Metrics are unavailable.';
      }
    }

    const logs = rows.map((row) => {
      const urn = urnByLogId.get(row.id) || null;
      const socialMetrics = urn ? socialMetricsByUrn.get(urn) : null;
      const orgMetrics = urn ? orgMetricsByUrn.get(urn) : null;
      const metrics = mergeLinkedInMetrics(
        mergeLinkedInMetrics(emptyLinkedInMetrics(), socialMetrics || null),
        orgMetrics || null
      );
      const hasMetrics = Object.values(metrics).some((value) => value !== null);
      return {
        id: row.id,
        status: row.status,
        share_target: row.share_target,
        share_mode: hasShareMode ? row.share_mode || null : null,
        visibility: row.visibility,
        share_url: row.share_url,
        error_message: row.error_message,
        created_at: row.created_at,
        urn,
        metrics: hasMetrics ? metrics : null,
      };
    });

    return NextResponse.json({ logs, note: metricsNote });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load LinkedIn logs.' }, { status: 500 });
  }
}
