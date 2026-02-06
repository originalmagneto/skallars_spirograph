import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ShareStats = {
  impressionCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  clickCount?: number;
  engagement?: number;
  uniqueImpressionsCount?: number;
};

const getUrnFromLog = (log: any) => {
  const responseId = log?.provider_response?.id;
  if (typeof responseId === 'string' && responseId.startsWith('urn:li:')) {
    return responseId;
  }
  const shareUrl: string | undefined = log?.share_url;
  if (shareUrl) {
    const parts = shareUrl.split('/');
    const candidate = parts[parts.length - 1];
    if (candidate && candidate.startsWith('urn:li:')) {
      return candidate;
    }
  }
  return null;
};

const buildOrgStatsUrl = (orgUrn: string, shareUrns: string[], ugcUrns: string[]) => {
  const base = 'https://api.linkedin.com/rest/organizationalEntityShareStatistics';
  const params: string[] = [
    'q=organizationalEntity',
    `organizationalEntity=${encodeURIComponent(orgUrn)}`,
  ];

  if (shareUrns.length > 0) {
    const encoded = shareUrns.map((urn) => encodeURIComponent(urn)).join(',');
    params.push(`shares=List(${encoded})`);
  }

  ugcUrns.forEach((urn, idx) => {
    params.push(`ugcPosts[${idx}]=${encodeURIComponent(urn)}`);
  });

  return `${base}?${params.join('&')}`;
};

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
      }, { status: 200 });
    }

    const { data: account } = await supabase
      .from('linkedin_accounts')
      .select('access_token, scopes')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!account?.access_token) {
      return NextResponse.json({
        analytics: [],
        org_urn: null,
        memberAnalyticsEnabled: false,
        note: 'LinkedIn account not connected.',
      }, { status: 200 });
    }

    const { data: defaultOrgSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'linkedin_default_org_urn')
      .limit(1);
    const defaultOrgUrn = defaultOrgSetting?.[0]?.value || '';

    const { data: logs } = await supabase
      .from('linkedin_share_logs')
      .select('id, share_target, provider_response, share_url, created_at')
      .eq('user_id', userData.user.id)
      .eq('status', 'success')
      .order('created_at', { ascending: false })
      .limit(20);

    const analytics: Array<{
      log_id: string;
      urn: string | null;
      metrics: ShareStats | null;
      source: 'organization' | 'member' | 'unknown';
    }> = [];

    const orgShareUrns: string[] = [];
    const orgUgcUrns: string[] = [];
    const logUrnMap = new Map<string, string | null>();

    (logs || []).forEach((log) => {
      const urn = getUrnFromLog(log);
      logUrnMap.set(log.id, urn);
      if (log.share_target === 'organization' && urn) {
        if (urn.includes('ugcPost')) {
          orgUgcUrns.push(urn);
        } else {
          orgShareUrns.push(urn);
        }
      }
    });

    const metricsByUrn = new Map<string, ShareStats>();

    if (defaultOrgUrn && (orgShareUrns.length > 0 || orgUgcUrns.length > 0)) {
      const url = buildOrgStatsUrl(defaultOrgUrn, orgShareUrns, orgUgcUrns);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'LinkedIn-Version': '202401',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(body?.elements)) {
        body.elements.forEach((element: any) => {
          const urn = element?.share || element?.ugcPost;
          if (!urn) return;
          metricsByUrn.set(urn, element?.totalShareStatistics || {});
        });
      }
    }

    (logs || []).forEach((log) => {
      const urn = logUrnMap.get(log.id) || null;
      const source = log.share_target === 'organization'
        ? 'organization'
        : log.share_target === 'member'
        ? 'member'
        : 'unknown';
      const metrics = urn ? metricsByUrn.get(urn) || null : null;
      analytics.push({ log_id: log.id, urn, metrics, source });
    });

    const scopes = Array.isArray(account?.scopes)
      ? account.scopes
      : typeof account?.scopes === 'string'
      ? account.scopes.split(/[\s,]+/).filter(Boolean)
      : [];
    const hasMemberAnalytics = scopes.includes('r_member_postAnalytics');

    return NextResponse.json({
      analytics,
      org_urn: defaultOrgUrn || null,
      memberAnalyticsEnabled: hasMemberAnalytics,
      note: !defaultOrgUrn
        ? 'Set a default organization URN to enable company analytics.'
        : !hasMemberAnalytics
        ? 'Member post analytics require r_member_postAnalytics; organization stats use organizationalEntityShareStatistics.'
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({
      analytics: [],
      org_urn: null,
      memberAnalyticsEnabled: false,
      note: error?.message || 'Failed to load LinkedIn analytics.',
    }, { status: 200 });
  }
}
