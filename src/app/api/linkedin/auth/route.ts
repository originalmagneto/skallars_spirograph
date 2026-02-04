import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { buildLinkedInAuthUrl } from '@/lib/linkedinApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const buildRedirectUrl = (redirectTo?: string | null) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  if (!redirectTo) return `${siteUrl}/admin?tab=article-studio`;
  if (redirectTo.startsWith('http')) {
    return redirectTo.startsWith(siteUrl) ? redirectTo : `${siteUrl}/admin?tab=article-studio`;
  }
  const normalized = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
  return `${siteUrl}${normalized}`;
};

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const redirectTo = buildRedirectUrl(payload?.redirectTo);

    const state = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: stateError } = await supabase.from('linkedin_oauth_states').insert({
      user_id: data.user.id,
      state,
      redirect_to: redirectTo,
      expires_at: expiresAt,
    });
    if (stateError) throw stateError;

    const url = buildLinkedInAuthUrl(state);
    return NextResponse.json({ url });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to start LinkedIn auth.' }, { status: 500 });
  }
}
