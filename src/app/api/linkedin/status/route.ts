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

    const { data: account } = await supabase
      .from('linkedin_accounts')
      .select('member_name, member_urn, expires_at, scopes, organization_urns, updated_at')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ connected: false });
    }

    const expiresAt = account.expires_at ? new Date(account.expires_at).getTime() : null;
    const expired = expiresAt ? expiresAt < Date.now() : false;

    return NextResponse.json({
      connected: true,
      member_name: account.member_name,
      member_urn: account.member_urn,
      expires_at: account.expires_at,
      expired,
      scopes: account.scopes || [],
      organization_urns: account.organization_urns || [],
      updated_at: account.updated_at,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load LinkedIn status.' }, { status: 500 });
  }
}
