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

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids') || '';
    const ids = idsParam
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ summaries: [] });
    }

    const { data, error } = await supabase
      .from('linkedin_share_logs')
      .select('article_id, share_url, created_at, share_target, share_mode')
      .eq('user_id', userData.user.id)
      .eq('status', 'success')
      .in('article_id', ids)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const { data: scheduledRows, error: scheduledError } = await supabase
      .from('linkedin_share_queue')
      .select('article_id, status, scheduled_at, share_target, share_mode')
      .eq('user_id', userData.user.id)
      .in('article_id', ids)
      .in('status', ['scheduled', 'retry', 'processing'])
      .order('scheduled_at', { ascending: true })
      .limit(200);

    if (scheduledError) throw scheduledError;

    const latestByArticle = new Map<
      string,
      {
        article_id: string;
        share_url: string | null;
        last_shared_at: string;
        share_target: string | null;
        share_mode: string | null;
        scheduled_at: string | null;
        scheduled_status: string | null;
        scheduled_share_target: string | null;
      }
    >();
    (data || []).forEach((row: any) => {
      if (!row?.article_id || latestByArticle.has(row.article_id)) return;
      latestByArticle.set(row.article_id, {
        article_id: row.article_id,
        share_url: row.share_url || null,
        last_shared_at: row.created_at,
        share_target: row.share_target || null,
        share_mode: row.share_mode || null,
        scheduled_at: null,
        scheduled_status: null,
        scheduled_share_target: null,
      });
    });

    (scheduledRows || []).forEach((row: any) => {
      if (!row?.article_id) return;
      const existing = latestByArticle.get(row.article_id);
      if (existing) {
        if (!existing.scheduled_at) {
          existing.scheduled_at = row.scheduled_at || null;
          existing.scheduled_status = row.status || null;
          existing.scheduled_share_target = row.share_target || null;
        }
        return;
      }
      latestByArticle.set(row.article_id, {
        article_id: row.article_id,
        share_url: null,
        last_shared_at: '',
        share_target: null,
        share_mode: null,
        scheduled_at: row.scheduled_at || null,
        scheduled_status: row.status || null,
        scheduled_share_target: row.share_target || null,
      });
    });

    return NextResponse.json({ summaries: Array.from(latestByArticle.values()) });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load LinkedIn share summary.' }, { status: 500 });
  }
}
