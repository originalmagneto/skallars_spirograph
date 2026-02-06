import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const toOrgUrn = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.startsWith('urn:li:organization:') ? trimmed : null;
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({
        connected: false,
        default_org_urn: toOrgUrn(process.env.LINKEDIN_DEFAULT_ORG_URN || null),
        error: 'Missing authorization token.',
        recoverable: true,
      }, { status: 200 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return NextResponse.json({
        connected: false,
        default_org_urn: toOrgUrn(process.env.LINKEDIN_DEFAULT_ORG_URN || null),
        error: 'Invalid session.',
        recoverable: true,
      }, { status: 200 });
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
    const defaultOrgUrn =
      toOrgUrn(defaultOrgSetting?.[0]?.value) ||
      toOrgUrn(process.env.LINKEDIN_DEFAULT_ORG_URN || null);

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
      recoverable: false,
      error: null,
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      default_org_urn: toOrgUrn(process.env.LINKEDIN_DEFAULT_ORG_URN || null),
      error: error?.message || 'Failed to load LinkedIn status.',
      recoverable: true,
    }, { status: 200 });
  }
}
