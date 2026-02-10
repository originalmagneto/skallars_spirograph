import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const supabaseKey = serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
};

export const getBaseUrlFromHeaders = async () => {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl;
  const h = await headers();
  const protocol = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  return `${protocol}://${host}`;
};

export async function fetchSeoSettings(keys: string[]) {
  if (!keys.length) return {};
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', keys);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  data.forEach((row) => {
    if (row.key) map[row.key] = row.value as string;
  });
  return map;
}
