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

    const { data: account } = await supabase
      .from('linkedin_accounts')
      .select('access_token, expires_at')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (!account?.access_token) {
      return NextResponse.json({ error: 'LinkedIn account not connected.' }, { status: 400 });
    }

    const response = await fetch(
      'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&projection=(elements*(organization,organization~(localizedName)))',
      {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: body?.message || 'Failed to load organizations.', details: body },
        { status: response.status }
      );
    }

    const orgs = Array.isArray(body?.elements)
      ? body.elements.map((element: any) => ({
          urn: element.organization,
          name: element['organization~']?.localizedName || element.organization,
        }))
      : [];

    await supabase.from('linkedin_accounts').update({
      organization_urns: orgs.map((org) => org.urn),
      updated_at: new Date().toISOString(),
    }).eq('user_id', userData.user.id);

    return NextResponse.json({ organizations: orgs });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load organizations.' }, { status: 500 });
  }
}
