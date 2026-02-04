import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { exchangeLinkedInCode, LINKEDIN_SCOPES } from '@/lib/linkedinApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const resolveRedirect = (redirectTo?: string | null) => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  if (!redirectTo) return `${siteUrl}/admin?tab=article-studio&linkedin=connected`;
  if (redirectTo.startsWith('http')) {
    return redirectTo.startsWith(siteUrl) ? redirectTo : `${siteUrl}/admin?tab=article-studio`;
  }
  const normalized = redirectTo.startsWith('/') ? redirectTo : `/${redirectTo}`;
  return `${siteUrl}${normalized}`;
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.redirect(resolveRedirect(null));
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: stateRow, error: stateError } = await supabase
      .from('linkedin_oauth_states')
      .select('*')
      .eq('state', state)
      .maybeSingle();

    if (stateError || !stateRow) {
      return NextResponse.redirect(resolveRedirect(null));
    }

    const expiresAt = new Date(stateRow.expires_at).getTime();
    if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
      await supabase.from('linkedin_oauth_states').delete().eq('state', state);
      return NextResponse.redirect(resolveRedirect(stateRow.redirect_to));
    }

    const tokenData = await exchangeLinkedInCode(code);

    let memberUrn: string | null = null;
    let memberName: string | null = null;
    try {
      const userInfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userInfoRes.ok) {
        const userInfo = await userInfoRes.json();
        if (userInfo?.sub) {
          memberUrn = `urn:li:person:${userInfo.sub}`;
        }
        if (userInfo?.given_name || userInfo?.family_name) {
          memberName = [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ');
        } else if (userInfo?.name) {
          memberName = userInfo.name;
        }
      }
    } catch {
      // Ignore userinfo failures
    }

    const expiresAtIso = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;
    const scopes = tokenData.scope ? tokenData.scope.split(' ') : LINKEDIN_SCOPES.split(' ');

    const { error: upsertError } = await supabase
      .from('linkedin_accounts')
      .upsert(
        {
          user_id: stateRow.user_id,
          member_urn: memberUrn,
          member_name: memberName,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          expires_at: expiresAtIso,
          scopes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) throw upsertError;

    await supabase.from('linkedin_oauth_states').delete().eq('state', state);

    return NextResponse.redirect(resolveRedirect(stateRow.redirect_to));
  } catch (error) {
    return NextResponse.redirect(resolveRedirect(null));
  }
}
