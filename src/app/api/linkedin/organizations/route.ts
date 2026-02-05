import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

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

    const { data: account } = await supabase
      .from('linkedin_accounts')
      .select('access_token, expires_at, scopes, organization_urns')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!account?.access_token) {
      return NextResponse.json({ error: 'LinkedIn account not connected.' }, { status: 400 });
    }
    const scopes = Array.isArray(account.scopes) ? account.scopes : [];
    const hasOrgScope = scopes.includes('w_organization_social') || scopes.includes('r_organization_social');
    if (!hasOrgScope) {
      return NextResponse.json(
        { error: 'Organization scopes not enabled for this LinkedIn account.' },
        { status: 403 }
      );
    }

    const headers = {
      Authorization: `Bearer ${account.access_token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401',
      'Linkedin-Version': '202401',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const restEndpoint =
      'https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization,organization~(localizedName)))';
    const legacyEndpoint =
      'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization,organization~(localizedName)))';

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
        const fallbackOrgs = Array.isArray(account.organization_urns)
          ? account.organization_urns.map((urn) => ({ urn, name: urn }))
          : [];
        return NextResponse.json(
          {
            organizations: fallbackOrgs,
            error: body?.message || body?.error?.message || legacyBody?.message || legacyBody?.error?.message || 'Failed to load organizations.',
            details: { rest: body, legacy: legacyBody },
            hint: 'Ensure your LinkedIn app has Organization/Community Management access and the token includes w_organization_social.',
          },
          { status: 200 }
        );
      }
    }

    const orgs = Array.isArray(body?.elements)
      ? body.elements.map((element: any) => ({
          urn: element.organization,
          name: element['organization~']?.localizedName || element.organization,
        }))
      : [];

    await supabase.from('linkedin_accounts').update({
      organization_urns: orgs.map((org) => org.urn),
      updated_at: new Date().toISOString(),
    }).eq('user_id', userData.user.id);

    return NextResponse.json({ organizations: orgs });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load organizations.' }, { status: 500 });
  }
}
