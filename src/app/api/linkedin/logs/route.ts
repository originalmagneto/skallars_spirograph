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
    const articleId = searchParams.get('articleId');

    let query = supabase
      .from('linkedin_share_logs')
      .select('id, status, share_target, visibility, share_url, error_message, created_at')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (articleId) {
      query = query.eq('article_id', articleId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ logs: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load LinkedIn logs.' }, { status: 500 });
  }
}
