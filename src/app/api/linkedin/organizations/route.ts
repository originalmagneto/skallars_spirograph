import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const toOrgUrn = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('urn:li:organization:')) return trimmed;
  if (/^\d+$/.test(trimmed)) return `urn:li:organization:${trimmed}`;
  const match = trimmed.match(/organization:(\d+)|company\/(\d+)/i);
  const extracted = match?.[1] || match?.[2];
  if (extracted) return `urn:li:organization:${extracted}`;
  return null;
};

const getOrgUrnsFromProviderResponse = (providerResponse: any): string[] => {
  const urns: string[] = [];
  if (!providerResponse || typeof providerResponse !== 'object') return urns;
  const direct = toOrgUrn(providerResponse.author);
  if (direct) urns.push(direct);
  const nested = toOrgUrn(providerResponse?.specificContent?.author);
  if (nested) urns.push(nested);
  return urns;
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json(
        { organizations: [], default_org_urn: null, error: 'Missing authorization token.', recoverable: true },
        { status: 200 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json(
        { organizations: [], default_org_urn: null, error: 'Invalid session.', recoverable: true },
        { status: 200 }
      );
    }

    const { data: accountRows } = await supabase
      .from('linkedin_accounts')
      .select('access_token, expires_at, scopes, organization_urns, member_urn')
      .eq('user_id', userData.user.id)
      .limit(1);
    const account = accountRows?.[0];

    if (!account?.access_token) {
      const { data: defaultOrg } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'linkedin_default_org_urn')
        .limit(1);
      const defaultOrgUrn =
        toOrgUrn(defaultOrg?.[0]?.value || null) ||
        toOrgUrn(process.env.LINKEDIN_DEFAULT_ORG_URN || null) ||
        '';
      const fallback = defaultOrgUrn ? [{ urn: defaultOrgUrn, name: 'Default Organization' }] : [];
      return NextResponse.json(
        {
          organizations: fallback,
          default_org_urn: defaultOrgUrn || null,
          error: 'LinkedIn account not connected.',
          hint: 'Reconnect LinkedIn or set a default organization URN in Settings.',
          recoverable: true,
        },
        { status: 200 }
      );
    }
    const { data: defaultOrgSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'linkedin_default_org_urn')
      .limit(1);
    const defaultOrgUrn =
      toOrgUrn(defaultOrgSetting?.[0]?.value) ||
      toOrgUrn(process.env.LINKEDIN_DEFAULT_ORG_URN || null) ||
      '';

    const fallbackUrnSet = new Set<string>();
    if (defaultOrgUrn) fallbackUrnSet.add(defaultOrgUrn);
    if (Array.isArray(account.organization_urns)) {
      account.organization_urns
        .map((urn) => toOrgUrn(urn))
        .filter(Boolean)
        .forEach((urn) => fallbackUrnSet.add(urn as string));
    }

    const { data: recentShareLogs } = await supabase
      .from('linkedin_share_logs')
      .select('provider_response')
      .eq('user_id', userData.user.id)
      .eq('status', 'success')
      .eq('share_target', 'organization')
      .order('created_at', { ascending: false })
      .limit(5);
    (recentShareLogs || []).forEach((log: any) => {
      getOrgUrnsFromProviderResponse(log?.provider_response).forEach((urn) => fallbackUrnSet.add(urn));
    });
    const fallbackOrgsFromCache = Array.from(fallbackUrnSet).map((urn) => ({ urn, name: urn }));

    const scopes = Array.isArray(account.scopes)
      ? account.scopes
      : typeof account.scopes === 'string'
      ? account.scopes.split(/[\s,]+/).filter(Boolean)
      : [];
    const hasOrgScope =
      scopes.includes('w_organization_social') ||
      scopes.includes('r_organization_social') ||
      scopes.includes('r_organization_admin') ||
      scopes.includes('rw_organization_admin');
    if (!hasOrgScope) {
      const fallback = fallbackOrgsFromCache;
      return NextResponse.json(
        {
          organizations: fallback,
          default_org_urn: defaultOrgUrn || null,
          error: 'Organization scopes are missing for this LinkedIn account.',
          hint: 'Reconnect LinkedIn after enabling r_organization_social and w_organization_social.',
          recoverable: true,
        },
        { status: 200 }
      );
    }
    if (!account.member_urn) {
      const fallback = fallbackOrgsFromCache;
      return NextResponse.json(
        {
          organizations: fallback,
          default_org_urn: defaultOrgUrn || null,
          error: 'LinkedIn member identifier is missing for this token.',
          hint: 'Reconnect LinkedIn so the account stores member_urn and org discovery can run.',
          recoverable: true,
        },
        { status: 200 }
      );
    }

    const headers = {
      Authorization: `Bearer ${account.access_token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': process.env.LINKEDIN_API_VERSION || '202601',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const roleAssignee = encodeURIComponent(account.member_urn);
    const restEndpoint =
      `https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&roleAssignee=${roleAssignee}&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization,organization~(localizedName)))`;
    const legacyEndpoint =
      `https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&roleAssignee=${roleAssignee}&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization,organization~(localizedName)))`;

    let response = await fetch(restEndpoint, { headers });
    let body = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Fallback to legacy endpoint in case REST is not enabled
      const legacyResponse = await fetch(legacyEndpoint, { headers });
      const legacyBody = await legacyResponse.json().catch(() => ({}));
      if (legacyResponse.ok) {
        response = legacyResponse;
        body = legacyBody;
      } else {
        const fallbackOrgs = fallbackOrgsFromCache;
        return NextResponse.json(
          {
            organizations: fallbackOrgs,
            default_org_urn: defaultOrgUrn || null,
            error: body?.message || body?.error?.message || legacyBody?.message || legacyBody?.error?.message || 'Failed to load organizations.',
            details: { rest: body, legacy: legacyBody },
            hint: 'Ensure your LinkedIn app has Organization/Community Management access and the token includes w_organization_social.',
            recoverable: true,
          },
          { status: 200 }
        );
      }
    }

    const orgsFromApi = Array.isArray(body?.elements)
      ? body.elements.map((element: any) => ({
          urn: element.organization,
          name: element['organization~']?.localizedName || element.organization,
        }))
      : [];
    const orgMap = new Map<string, { urn: string; name: string }>();
    orgsFromApi.forEach((org: { urn: string; name: string }) => orgMap.set(org.urn, org));
    if (defaultOrgUrn && !orgMap.has(defaultOrgUrn)) {
      orgMap.set(defaultOrgUrn, { urn: defaultOrgUrn, name: 'Default Organization' });
    }
    const orgs = Array.from(orgMap.values());

    await supabase.from('linkedin_accounts').update({
      organization_urns: orgs.map((org) => org.urn),
      updated_at: new Date().toISOString(),
    }).eq('user_id', userData.user.id);

    return NextResponse.json({
      organizations: orgs,
      default_org_urn: defaultOrgUrn || null,
      error: null,
      recoverable: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        organizations: [],
        default_org_urn: null,
        error: error?.message || 'Failed to load organizations.',
        recoverable: true,
      },
      { status: 200 }
    );
  }
}
