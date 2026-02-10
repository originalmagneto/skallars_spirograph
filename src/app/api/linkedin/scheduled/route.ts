import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isMissingColumnError } from '@/lib/linkedinMetrics';

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

    const { searchParams } = new URL(req.url);
    const articleId = searchParams.get('articleId');

    const buildQuery = (selectClause: string) => {
      let query = supabase
        .from('linkedin_share_queue')
        .select(selectClause)
        .eq('user_id', userData.user.id)
        .order('scheduled_at', { ascending: true })
        .limit(20);
      if (articleId) {
        query = query.eq('article_id', articleId);
      }
      return query;
    };

    let { data, error } = await buildQuery(
      'id, status, share_target, share_mode, visibility, scheduled_at, error_message, created_at'
    );
    let hasShareMode = true;
    if (error && isMissingColumnError(error, 'share_mode')) {
      hasShareMode = false;
      const fallback = await buildQuery(
        'id, status, share_target, visibility, scheduled_at, error_message, created_at'
      );
      data = fallback.data;
      error = fallback.error;
    }
    if (error) throw error;

    return NextResponse.json({
      scheduled: (data || []).map((row: any) => ({
        ...row,
        share_mode: hasShareMode ? row.share_mode || null : null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load scheduled shares.' }, { status: 500 });
  }
}
