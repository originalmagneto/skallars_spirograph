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
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    const { data: accountRows } = await supabase
      .from('linkedin_accounts')
      .select('member_name, member_urn, expires_at, scopes, organization_urns, updated_at')
      .eq('user_id', data.user.id)
      .limit(1);
    const account = accountRows?.[0];

    const { data: defaultOrgSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'linkedin_default_org_urn')
      .limit(1);
    const defaultOrgUrn = defaultOrgSetting?.[0]?.value || null;

    if (!account) {
      return NextResponse.json({
        connected: false,
        default_org_urn: defaultOrgUrn,
      });
    }

    const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : null;
    const expired = expiresAt ? expiresAt < Date.now() : false;
    const rawScopes = account.scopes;
    const scopes = Array.isArray(rawScopes)
      ? rawScopes
      : typeof rawScopes === 'string'
      ? rawScopes.split(/[\s,]+/).filter(Boolean)
      : [];
    const mergedOrganizations = Array.from(
      new Set([
        ...(Array.isArray(account.organization_urns) ? account.organization_urns : []),
        ...(defaultOrgUrn ? [defaultOrgUrn] : []),
      ])
    );

    return NextResponse.json({
      connected: true,
      member_name: account.member_name,
      member_urn: account.member_urn,
      expires_at: account.expires_at,
      expired,
      scopes,
      organization_urns: mergedOrganizations,
      default_org_urn: defaultOrgUrn,
      updated_at: account.updated_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load LinkedIn status.' }, { status: 500 });
  }
}
