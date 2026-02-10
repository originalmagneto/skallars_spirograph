import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMissingColumnError } from '@/lib/linkedinMetrics';

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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }

    const requestPayload = await req.json();
    const articleId = requestPayload?.articleId || null;
    const scheduledAt = requestPayload?.scheduledAt;
    const message = requestPayload?.message || null;
    const shareTarget = requestPayload?.shareTarget === 'organization' ? 'organization' : 'member';
    let organizationUrn = toOrgUrn(requestPayload?.organizationUrn) || null;
    const visibility = requestPayload?.visibility || 'PUBLIC';
    const shareMode = requestPayload?.shareMode === 'image' ? 'image' : 'article';
    const imageUrl = requestPayload?.imageUrl || null;

    if (!scheduledAt) {
      return NextResponse.json({ error: 'Missing scheduledAt.' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledAt.' }, { status: 400 });
    }

    if (shareTarget === 'organization') {
      const { data: accountRows } = await supabase
        .from('linkedin_accounts')
        .select('scopes, organization_urns')
        .eq('user_id', userData.user.id)
        .limit(1);
      const account = accountRows?.[0];
      const scopes = Array.isArray(account?.scopes)
        ? account.scopes
        : typeof account?.scopes === 'string'
        ? account.scopes.split(/[\s,]+/).filter(Boolean)
        : [];
      const hasOrgScope = scopes.includes('w_organization_social') || scopes.includes('r_organization_social');
      if (!hasOrgScope) {
        return NextResponse.json(
          { error: 'Organization sharing is not enabled for this LinkedIn account.' },
          { status: 403 }
        );
      }
      if (!organizationUrn) {
        const { data: orgSettingRows } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'linkedin_default_org_urn')
          .limit(1);
        organizationUrn =
          toOrgUrn(orgSettingRows?.[0]?.value) ||
          toOrgUrn(process.env.LINKEDIN_DEFAULT_ORG_URN || null) ||
          null;
      }
      if (!organizationUrn && Array.isArray(account?.organization_urns)) {
        organizationUrn = account.organization_urns
          .map((urn) => toOrgUrn(urn))
          .find(Boolean) || null;
      }
      if (!organizationUrn) {
        const { data: recentOrgLog } = await supabase
          .from('linkedin_share_logs')
          .select('provider_response')
          .eq('user_id', userData.user.id)
          .eq('status', 'success')
          .eq('share_target', 'organization')
          .order('created_at', { ascending: false })
          .limit(1);
        organizationUrn = toOrgUrn(recentOrgLog?.[0]?.provider_response?.author || null) || null;
      }
      if (!organizationUrn) {
        return NextResponse.json(
          { error: 'Select a LinkedIn organization or set a default organization URN in LinkedIn Settings.' },
          { status: 400 }
        );
      }
    }

    const payload = {
      user_id: userData.user.id,
      article_id: articleId,
      share_target: shareTarget,
      share_mode: shareMode,
      organization_urn: organizationUrn,
      image_url: imageUrl,
      visibility,
      message,
      scheduled_at: scheduledDate.toISOString(),
      status: 'scheduled',
    };

    let { data, error } = await supabase
      .from('linkedin_share_queue')
      .insert(payload)
      .select('*')
      .single();

    if (error && isMissingColumnError(error, 'share_mode')) {
      const { share_mode: _shareMode, ...fallbackPayload } = payload;
      const fallback = await supabase
        .from('linkedin_share_queue')
        .insert(fallbackPayload)
        .select('*')
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    return NextResponse.json({ scheduled: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to schedule LinkedIn share.' }, { status: 500 });
  }
}
