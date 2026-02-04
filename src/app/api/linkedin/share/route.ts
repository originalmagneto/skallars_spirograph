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
  let userId: string | null = null;
  let articleId: string | null = null;
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
    }
    userId = userData.user.id;

    const payload = await req.json();
    const shareTarget = payload?.shareTarget === 'organization' ? 'organization' : 'member';
    const organizationUrn = payload?.organizationUrn as string | undefined;
    const visibility = payload?.visibility || 'PUBLIC';
    const shareMode = payload?.shareMode === 'image' ? 'image' : 'article';
    const imageUrl = payload?.imageUrl as string | undefined;
    articleId = payload?.articleId || null;

    const { data: account } = await supabase
      .from('linkedin_accounts')
      .select('access_token, expires_at, member_urn, scopes')
      .eq('user_id', userId)
      .maybeSingle();

    if (!account?.access_token) {
      return NextResponse.json({ error: 'LinkedIn account not connected.' }, { status: 400 });
    }
    const scopes = Array.isArray(account.scopes) ? account.scopes : [];
    const hasOrgScope = scopes.includes('w_organization_social') || scopes.includes('r_organization_social');
    if (shareTarget === 'organization' && !hasOrgScope) {
      return NextResponse.json(
        { error: 'Organization sharing is not enabled for this LinkedIn account.' },
        { status: 403 }
      );
    }

    if (account.expires_at) {
      const expiresAt = new Date(account.expires_at).getTime();
      if (!Number.isNaN(expiresAt) && expiresAt < Date.now()) {
        return NextResponse.json({ error: 'LinkedIn access token expired. Please reconnect.' }, { status: 401 });
      }
    }

    let linkUrl = payload?.linkUrl as string | undefined;
    let title = payload?.title as string | undefined;
    let excerpt = payload?.excerpt as string | undefined;

    if (articleId) {
      const { data: article, error: articleError } = await supabase
        .from('articles')
        .select('slug, title_sk, title_en, title_de, title_cn, excerpt_sk, excerpt_en, excerpt_de, excerpt_cn')
        .eq('id', articleId)
        .maybeSingle();
      if (articleError) throw articleError;

      if (article) {
        title =
          article.title_sk ||
          article.title_en ||
          article.title_de ||
          article.title_cn ||
          title;
        excerpt =
          article.excerpt_sk ||
          article.excerpt_en ||
          article.excerpt_de ||
          article.excerpt_cn ||
          excerpt;
        if (!linkUrl && article.slug) {
          linkUrl = `${getSiteUrl()}/blog/${article.slug}`;
        }
      }
    }

    const message = payload?.message || title || 'New article from Skallars.';

    const author =
      shareTarget === 'organization'
        ? organizationUrn
        : account.member_urn;

    if (!author) {
      return NextResponse.json({ error: 'LinkedIn author URN missing.' }, { status: 400 });
    }

    let shareBody: any = null;

    if (shareMode === 'image') {
      if (!imageUrl) {
        return NextResponse.json({ error: 'Missing image URL.' }, { status: 400 });
      }
      const asset = await registerLinkedInImage(account.access_token, author, imageUrl);
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
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
        },
      };
    } else {
      if (!linkUrl) {
        return NextResponse.json({ error: 'Missing article link URL.' }, { status: 400 });
      }
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
          'com.linkedin.ugc.MemberNetworkVisibility': visibility,
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
      await supabase.from('linkedin_share_logs').insert({
        user_id: userId,
        article_id: articleId,
        share_target: shareTarget,
        visibility,
        status: 'error',
        provider_response: responseBody,
        error_message: responseBody?.message || 'LinkedIn share failed',
      });
      return NextResponse.json(
        { error: responseBody?.message || 'LinkedIn share failed', details: responseBody },
        { status: response.status }
      );
    }

    const shareId = responseBody?.id as string | undefined;
    const shareUrl = shareId ? `https://www.linkedin.com/feed/update/${shareId}` : null;

    await supabase.from('linkedin_share_logs').insert({
      user_id: userId,
      article_id: articleId,
      share_target: shareTarget,
      visibility,
      status: 'success',
      share_url: shareUrl,
      provider_response: responseBody,
    });

    return NextResponse.json({ success: true, response: responseBody });
  } catch (error: any) {
    if (userId) {
      await supabase.from('linkedin_share_logs').insert({
        user_id: userId,
        article_id: articleId,
        status: 'error',
        error_message: error?.message || 'LinkedIn share failed',
      });
    }
    return NextResponse.json({ error: error?.message || 'LinkedIn share failed' }, { status: 500 });
  }
}
