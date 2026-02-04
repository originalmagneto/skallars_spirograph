import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getSiteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || '';

const registerLinkedInImage = async (
  accessToken: string,
  ownerUrn: string,
  imageUrl: string
) => {
  const registerRes = await fetch(
    'https://api.linkedin.com/v2/assets?action=registerUpload',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: ownerUrn,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            },
          ],
        },
      }),
    }
  );

  const registerBody = await registerRes.json().catch(() => ({}));
  if (!registerRes.ok) {
    throw new Error(registerBody?.message || 'LinkedIn image registration failed.');
  }

  const uploadUrl =
    registerBody?.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
      ?.uploadUrl;
  const asset = registerBody?.value?.asset;

  if (!uploadUrl || !asset) {
    throw new Error('LinkedIn image upload URL missing.');
  }

  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    throw new Error('Failed to fetch image for LinkedIn upload.');
  }
  const imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  const contentType = imageRes.headers.get('content-type') || 'image/jpeg';

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': contentType,
    },
    body: imageBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error('LinkedIn image upload failed.');
  }

  return asset as string;
};

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const schedulerSecret = process.env.LINKEDIN_SCHEDULER_SECRET;
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cronSecret = req.headers.get('x-scheduler-secret');

    let userId: string | null = null;
    let runAll = false;

    if (token) {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) {
        return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
      }
      userId = userData.user.id;
    } else if (schedulerSecret && cronSecret === schedulerSecret) {
      runAll = true;
    } else {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const nowIso = new Date().toISOString();
    let query = supabase
      .from('linkedin_share_queue')
      .select('*')
      .lte('scheduled_at', nowIso)
      .in('status', ['scheduled', 'retry'])
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: queueItems, error } = await query;
    if (error) throw error;

    const results: Array<{ id: string; status: string; message?: string }> = [];

    for (const item of queueItems || []) {
      const { error: lockError } = await supabase
        .from('linkedin_share_queue')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('status', item.status);

      if (lockError) {
        results.push({ id: item.id, status: 'skipped', message: 'Failed to lock item.' });
        continue;
      }

      const { data: account } = await supabase
        .from('linkedin_accounts')
        .select('access_token, expires_at, member_urn')
        .eq('user_id', item.user_id)
        .maybeSingle();

      if (!account?.access_token) {
        await supabase
          .from('linkedin_share_queue')
          .update({ status: 'error', error_message: 'LinkedIn not connected.', updated_at: new Date().toISOString() })
          .eq('id', item.id);
        results.push({ id: item.id, status: 'error', message: 'LinkedIn not connected.' });
        continue;
      }

      if (account.expires_at) {
        const expiresAt = new Date(account.expires_at).getTime();
        if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
          await supabase
            .from('linkedin_share_queue')
            .update({ status: 'error', error_message: 'Token expired.', updated_at: new Date().toISOString() })
            .eq('id', item.id);
          results.push({ id: item.id, status: 'error', message: 'Token expired.' });
          continue;
        }
      }

      let linkUrl = getSiteUrl();
      let title: string | null = null;
      let excerpt: string | null = null;

      if (item.article_id) {
        const { data: article } = await supabase
          .from('articles')
          .select('slug, title_sk, title_en, title_de, title_cn, excerpt_sk, excerpt_en, excerpt_de, excerpt_cn')
          .eq('id', item.article_id)
          .maybeSingle();
        if (article?.slug) {
          linkUrl = `${getSiteUrl()}/blog/${article.slug}`;
        }
        title =
          article?.title_sk ||
          article?.title_en ||
          article?.title_de ||
          article?.title_cn ||
          null;
        excerpt =
          article?.excerpt_sk ||
          article?.excerpt_en ||
          article?.excerpt_de ||
          article?.excerpt_cn ||
          null;
      }

      if (!linkUrl || !linkUrl.startsWith('http')) {
        await supabase
          .from('linkedin_share_queue')
          .update({ status: 'error', error_message: 'Missing article URL.', updated_at: new Date().toISOString() })
          .eq('id', item.id);
        results.push({ id: item.id, status: 'error', message: 'Missing article URL.' });
        continue;
      }

      const message = item.message || title || 'New article from Skallars.';
      const shareTarget = item.share_target === 'organization' ? 'organization' : 'member';
      const shareMode = item.share_mode === 'image' ? 'image' : 'article';
      const author = shareTarget === 'organization' ? item.organization_urn : account.member_urn;

      if (!author) {
        await supabase
          .from('linkedin_share_queue')
          .update({ status: 'error', error_message: 'Missing LinkedIn author.', updated_at: new Date().toISOString() })
          .eq('id', item.id);
        results.push({ id: item.id, status: 'error', message: 'Missing LinkedIn author.' });
        continue;
      }

      let shareBody: any = null;

      if (shareMode === 'image') {
        if (!item.image_url) {
          await supabase
            .from('linkedin_share_queue')
            .update({ status: 'error', error_message: 'Missing image URL.', updated_at: new Date().toISOString() })
            .eq('id', item.id);
          results.push({ id: item.id, status: 'error', message: 'Missing image URL.' });
          continue;
        }
        const asset = await registerLinkedInImage(account.access_token, author, item.image_url);
        const linkSuffix = linkUrl ? `\n\n${linkUrl}` : '';
        shareBody = {
          author,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: `${message}${linkSuffix}`.trim() },
              shareMediaCategory: 'IMAGE',
              media: [
                {
                  status: 'READY',
                  media: asset,
                  title: title ? { text: title } : undefined,
                  description: excerpt ? { text: excerpt } : undefined,
                },
              ],
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': item.visibility || 'PUBLIC',
          },
        };
      } else {
        shareBody = {
          author,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: message },
              shareMediaCategory: 'ARTICLE',
              media: [
                {
                  status: 'READY',
                  originalUrl: linkUrl,
                  title: title ? { text: title } : undefined,
                  description: excerpt ? { text: excerpt } : undefined,
                },
              ],
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': item.visibility || 'PUBLIC',
          },
        };
      }

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${account.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareBody),
      });

      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        await supabase
          .from('linkedin_share_queue')
          .update({
            status: 'error',
            error_message: responseBody?.message || 'LinkedIn share failed',
            provider_response: responseBody,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        await supabase.from('linkedin_share_logs').insert({
          user_id: item.user_id,
          article_id: item.article_id,
          share_target: shareTarget,
          visibility: item.visibility || 'PUBLIC',
          status: 'error',
          provider_response: responseBody,
          error_message: responseBody?.message || 'LinkedIn share failed',
        });
        results.push({ id: item.id, status: 'error', message: responseBody?.message || 'Share failed.' });
        continue;
      }

      const shareId = responseBody?.id as string | undefined;
      const shareUrl = shareId ? `https://www.linkedin.com/feed/update/${shareId}` : null;

      await supabase
        .from('linkedin_share_queue')
        .update({
          status: 'success',
          provider_response: responseBody,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      await supabase.from('linkedin_share_logs').insert({
        user_id: item.user_id,
        article_id: item.article_id,
        share_target: shareTarget,
        visibility: item.visibility || 'PUBLIC',
        status: 'success',
        share_url: shareUrl,
        provider_response: responseBody,
      });

      results.push({ id: item.id, status: 'success' });
    }

    return NextResponse.json({ processed: results.length, results, runAll });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to run scheduled shares.' }, { status: 500 });
  }
}
