import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    const payload = await req.json();
    const articleId = payload?.articleId || null;
    const scheduledAt = payload?.scheduledAt;
    const message = payload?.message || null;
    const shareTarget = payload?.shareTarget === 'organization' ? 'organization' : 'member';
    const organizationUrn = payload?.organizationUrn || null;
    const visibility = payload?.visibility || 'PUBLIC';

    if (!scheduledAt) {
      return NextResponse.json({ error: 'Missing scheduledAt.' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'Invalid scheduledAt.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('linkedin_share_queue')
      .insert({
        user_id: userData.user.id,
        article_id: articleId,
        share_target: shareTarget,
        organization_urn: organizationUrn,
        visibility,
        message,
        scheduled_at: scheduledDate.toISOString(),
        status: 'scheduled',
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ scheduled: data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to schedule LinkedIn share.' }, { status: 500 });
  }
}
