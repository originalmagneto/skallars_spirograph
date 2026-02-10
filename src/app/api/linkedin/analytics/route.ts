import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  emptyLinkedInMetrics,
  fetchOrganizationShareMetrics,
  fetchSocialActionMetrics,
  getOrgUrnFromShareLog,
  getUrnFromShareLog,
  mergeLinkedInMetrics,
  toOrgUrn,
} from '@/lib/linkedinMetrics';
import type { LinkedInInteractionMetrics } from '@/lib/linkedinMetrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({
        analytics: [],
        org_urn: null,
        memberAnalyticsEnabled: false,
        note: 'Missing authorization token.',
        error: 'Missing authorization token.',
        recoverable: true,
      }, { status: 200 });
    }

    const supabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({
        analytics: [],
        org_urn: null,
        memberAnalyticsEnabled: false,
        note: 'Invalid session.',
        error: 'Invalid session.',
        recoverable: true,
      }, { status: 200 });
    }

    const { data: accountRows } = await supabase
      .from('linkedin_accounts')
      .select('access_token, scopes, organization_urns')
      .eq('user_id', userData.user.id)
      .limit(1);
    const account = accountRows?.[0];

    if (!account?.access_token) {
      return NextResponse.json({
        analytics: [],
        org_urn: null,
        memberAnalyticsEnabled: false,
        note: 'LinkedIn account not connected.',
        error: 'LinkedIn account not connected.',
        recoverable: true,
      }, { status: 200 });
    }

    const { data: defaultOrgSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'linkedin_default_org_urn')
      .limit(1);
    const defaultOrgUrn =
      toOrgUrn(defaultOrgSetting?.[0]?.value) ||
      toOrgUrn(account?.organization_urns?.[0] || null) ||
      toOrgUrn(process.env.LINKEDIN_DEFAULT_ORG_URN || null) ||
      '';

    const { data: logs } = await supabase
      .from('linkedin_share_logs')
      .select('id, share_target, provider_response, share_url, created_at')
      .eq('user_id', userData.user.id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(50);

    const analytics: Array<{
      log_id: string;
      urn: string | null;
      metrics: LinkedInInteractionMetrics | null;
      source: 'organization' | 'member' | 'unknown';
    }> = [];

    const scopes = Array.isArray(account?.scopes)
      ? account.scopes
      : typeof account?.scopes === 'string'
      ? account.scopes.split(/[\s,]+/).filter(Boolean)
      : [];
    const hasOrgScope = scopes.includes('r_organization_social') || scopes.includes('w_organization_social');
    const hasMemberSocialRead = scopes.includes('r_member_social');
    const hasMemberAnalytics = scopes.includes('r_member_postAnalytics');

    const logUrnMap = new Map<string, string | null>();
    (logs || []).forEach((log: any) => {
      const urn = getUrnFromShareLog(log);
      logUrnMap.set(log.id, urn);
    });

    const urns = Array.from(
      new Set(Array.from(logUrnMap.values()).filter((urn): urn is string => Boolean(urn)))
    );

    let socialMetricsByUrn = new Map<string, Partial<LinkedInInteractionMetrics>>();
    try {
      socialMetricsByUrn = await fetchSocialActionMetrics(account.access_token, urns);
    } catch {
      // keep partial analytics output if social actions API is degraded
    }

    const orgMetricsByUrn = new Map<string, Partial<LinkedInInteractionMetrics>>();
    if (hasOrgScope) {
      const urnsByOrg = new Map<string, string[]>();
      (logs || []).forEach((log: any) => {
        if (log.share_target !== 'organization') return;
        const urn = logUrnMap.get(log.id);
        if (!urn) return;
        const orgUrn = getOrgUrnFromShareLog(log) || defaultOrgUrn || null;
        if (!orgUrn) return;
        const current = urnsByOrg.get(orgUrn) || [];
        current.push(urn);
        urnsByOrg.set(orgUrn, current);
      });

      for (const [orgUrn, orgUrns] of urnsByOrg.entries()) {
        try {
          const metrics = await fetchOrganizationShareMetrics(
            account.access_token,
            orgUrn,
            Array.from(new Set(orgUrns))
          );
          metrics.forEach((value, urn) => orgMetricsByUrn.set(urn, value));
        } catch {
          // keep partial analytics output if org stats API is degraded
        }
      }
    }

    (logs || []).forEach((log) => {
      const urn = logUrnMap.get(log.id) || null;
      const source = log.share_target === 'organization'
        ? 'organization'
        : log.share_target === 'member'
        ? 'member'
        : 'unknown';
      const socialMetrics = urn ? socialMetricsByUrn.get(urn) : null;
      const orgMetrics = urn ? orgMetricsByUrn.get(urn) : null;
      const mergedMetrics = mergeLinkedInMetrics(
        mergeLinkedInMetrics(emptyLinkedInMetrics(), socialMetrics || null),
        orgMetrics || null
      );
      const hasMetrics = Object.values(mergedMetrics).some((value) => value !== null);
      analytics.push({
        log_id: log.id,
        urn,
        metrics: hasMetrics ? mergedMetrics : null,
        source,
      });
    });

    const notes: string[] = [];
    const memberShareCount = (logs || []).filter((log: any) => log.share_target === 'member').length;
    const orgShareCount = (logs || []).filter((log: any) => log.share_target === 'organization').length;
    const metricsRows = analytics.filter((item) => item.metrics !== null).length;

    if (memberShareCount > 0 && !hasMemberSocialRead) {
      notes.push('Member post engagement can be incomplete without r_member_social.');
    }
    if (orgShareCount > 0 && !hasOrgScope) {
      notes.push('Organization detail metrics require organization scopes.');
    }
    if (urns.length > 0 && metricsRows === 0) {
      notes.push('LinkedIn metrics can appear with short delay after publishing. Try syncing again in a few minutes.');
    }
    if (!hasMemberAnalytics) {
      notes.push('Member post analytics endpoint requires r_member_postAnalytics.');
    }

    return NextResponse.json({
      analytics,
      org_urn: defaultOrgUrn || null,
      memberAnalyticsEnabled: hasMemberAnalytics,
      error: null,
      recoverable: false,
      note: notes.length > 0 ? notes.join(' ') : null,
    });
  } catch (error: any) {
    return NextResponse.json({
      analytics: [],
      org_urn: null,
      memberAnalyticsEnabled: false,
      note: error?.message || 'Failed to load LinkedIn analytics.',
      error: error?.message || 'Failed to load LinkedIn analytics.',
      recoverable: true,
    }, { status: 200 });
  }
}
