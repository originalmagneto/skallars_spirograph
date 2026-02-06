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

    const fallbackRole =
      userData.user.app_metadata?.role ||
      userData.user.user_metadata?.role ||
      'user';

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { role: fallbackRole, degraded: true, source: 'fallback', error: error.message || 'Role lookup failed.' },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        }
      );
    }

    return NextResponse.json(
      { role: profile?.role || fallbackRole || 'user', degraded: false, source: 'profile' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    return NextResponse.json(
      { role: 'user', degraded: true, source: 'fallback', error: error?.message || 'Role lookup failed.' },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
