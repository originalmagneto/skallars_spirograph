import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type GenerationStatus = 'started' | 'succeeded' | 'failed' | 'aborted' | 'unknown';

type DaySummary = {
  day: string;
  total: number;
  succeeded: number;
  failed: number;
  aborted: number;
  started: number;
};

const toDayKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const normalizeStatus = (value: unknown): GenerationStatus => {
  if (value === 'started') return 'started';
  if (value === 'succeeded') return 'succeeded';
  if (value === 'failed') return 'failed';
  if (value === 'aborted') return 'aborted';
  return 'unknown';
};

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    const role = profile?.role || userData.user.app_metadata?.role || userData.user.user_metadata?.role || 'user';
    const canViewGlobal = role === 'admin' || role === 'editor';

    let query = supabase
      .from('ai_generation_logs')
      .select('request_id, status, created_at')
      .eq('action', 'generate_article')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (!canViewGlobal) {
      query = query.eq('user_id', userData.user.id);
    }

    const { data: rows, error } = await query;
    if (error) throw error;

    const byRequest = new Map<string, { created_at: string; status: GenerationStatus }>();
    (rows || []).forEach((row: any, index: number) => {
      const requestId = row?.request_id || `legacy-${row?.created_at || 'unknown'}-${index}`;
      if (byRequest.has(requestId)) return;
      byRequest.set(requestId, {
        created_at: row?.created_at || '',
        status: normalizeStatus(row?.status),
      });
    });

    const totals = {
      total: 0,
      succeeded: 0,
      failed: 0,
      aborted: 0,
      started: 0,
      unknown: 0,
    };

    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const dayMap = new Map<string, DaySummary>();
    Array.from(byRequest.values()).forEach((row) => {
      const status = row.status;
      totals.total += 1;
      if (status === 'succeeded') totals.succeeded += 1;
      else if (status === 'failed') totals.failed += 1;
      else if (status === 'aborted') totals.aborted += 1;
      else if (status === 'started') totals.started += 1;
      else totals.unknown += 1;

      const createdAt = new Date(row.created_at || '').getTime();
      if (Number.isNaN(createdAt) || createdAt < cutoff) return;
      const day = toDayKey(row.created_at || '');
      if (!day) return;
      const existing =
        dayMap.get(day) ||
        {
          day,
          total: 0,
          succeeded: 0,
          failed: 0,
          aborted: 0,
          started: 0,
        };
      existing.total += 1;
      if (status === 'succeeded') existing.succeeded += 1;
      if (status === 'failed') existing.failed += 1;
      if (status === 'aborted') existing.aborted += 1;
      if (status === 'started') existing.started += 1;
      dayMap.set(day, existing);
    });

    const trend = Array.from(dayMap.values()).sort((a, b) => a.day.localeCompare(b.day));

    return NextResponse.json({
      totals,
      trend,
      windowDays: 14,
      canViewGlobal,
      rowCount: rows?.length || 0,
      requestCount: byRequest.size,
      cap: 5000,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load generation summary.' }, { status: 500 });
  }
}
