type MaybeNumber = number | null;

export type LinkedInInteractionMetrics = {
  likeCount: MaybeNumber;
  commentCount: MaybeNumber;
  shareCount: MaybeNumber;
  impressionCount: MaybeNumber;
  clickCount: MaybeNumber;
  engagement: MaybeNumber;
  uniqueImpressionsCount: MaybeNumber;
};

const LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION || '202601';

const toNumberOrNull = (value: unknown): MaybeNumber => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const trimToNull = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const decodeSafe = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const chunk = <T,>(items: T[], size: number): T[][] => {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

export const toOrgUrn = (value?: string | null) => {
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

export const isMissingColumnError = (error: any, column: string) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('column') &&
    message.includes(column.toLowerCase()) &&
    message.includes('does not exist')
  );
};

export const emptyLinkedInMetrics = (): LinkedInInteractionMetrics => ({
  likeCount: null,
  commentCount: null,
  shareCount: null,
  impressionCount: null,
  clickCount: null,
  engagement: null,
  uniqueImpressionsCount: null,
});

export const mergeLinkedInMetrics = (
  base: LinkedInInteractionMetrics,
  patch?: Partial<LinkedInInteractionMetrics> | null
): LinkedInInteractionMetrics => ({
  ...base,
  ...(patch || {}),
});

export const getUrnFromShareLog = (log: any): string | null => {
  const responseId = trimToNull(log?.provider_response?.id);
  if (responseId && responseId.startsWith('urn:li:')) {
    return responseId;
  }

  const directUrn = trimToNull(log?.provider_response?.urn);
  if (directUrn && directUrn.startsWith('urn:li:')) {
    return directUrn;
  }

  const shareUrl = trimToNull(log?.share_url);
  if (shareUrl) {
    const maybeUrnFromPath = decodeSafe(shareUrl.split('/').filter(Boolean).pop() || '');
    if (maybeUrnFromPath.startsWith('urn:li:')) return maybeUrnFromPath;
  }

  return null;
};

export const getOrgUrnFromShareLog = (log: any): string | null =>
  toOrgUrn(log?.provider_response?.author || null);

const parseSocialActionMetrics = (payload: any): Partial<LinkedInInteractionMetrics> => {
  const likes =
    toNumberOrNull(payload?.likesSummary?.totalLikes) ??
    toNumberOrNull(payload?.likeSummary?.totalLikes) ??
    toNumberOrNull(payload?.totalSocialActivityCounts?.numLikes);
  const comments =
    toNumberOrNull(payload?.commentsSummary?.totalFirstLevelComments) ??
    toNumberOrNull(payload?.commentSummary?.totalFirstLevelComments) ??
    toNumberOrNull(payload?.totalSocialActivityCounts?.numComments);
  const shares =
    toNumberOrNull(payload?.shareSummary?.totalShares) ??
    toNumberOrNull(payload?.totalSocialActivityCounts?.numShares);
  return {
    likeCount: likes,
    commentCount: comments,
    shareCount: shares,
  };
};

const getSocialActionEntries = (body: any): Array<{ urn: string; payload: any }> => {
  if (body?.results && typeof body.results === 'object') {
    return Object.entries(body.results)
      .map(([urn, payload]) => ({ urn: decodeSafe(urn), payload }))
      .filter((item) => item.urn.startsWith('urn:li:'));
  }

  if (Array.isArray(body?.elements)) {
    return body.elements
      .map((payload: any) => {
        const urn =
          trimToNull(payload?.entity) ||
          trimToNull(payload?.target) ||
          trimToNull(payload?.activity) ||
          trimToNull(payload?.id) ||
          null;
        return urn ? { urn: decodeSafe(urn), payload } : null;
      })
      .filter(Boolean) as Array<{ urn: string; payload: any }>;
  }

  const directUrn =
    trimToNull(body?.entity) ||
    trimToNull(body?.target) ||
    trimToNull(body?.activity) ||
    trimToNull(body?.id) ||
    null;
  if (directUrn) {
    return [{ urn: decodeSafe(directUrn), payload: body }];
  }

  return [];
};

export const fetchSocialActionMetrics = async (
  accessToken: string,
  urns: string[]
): Promise<Map<string, Partial<LinkedInInteractionMetrics>>> => {
  const out = new Map<string, Partial<LinkedInInteractionMetrics>>();
  const deduped = Array.from(new Set(urns.filter((urn) => urn.startsWith('urn:li:'))));
  if (deduped.length === 0) return out;

  for (const urnChunk of chunk(deduped, 20)) {
    try {
      const idsParam = urnChunk.map((urn) => encodeURIComponent(urn)).join(',');
      const url = `https://api.linkedin.com/rest/socialActions?ids=List(${idsParam})`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': LINKEDIN_VERSION,
          'X-Restli-Protocol-Version': '2.0.0',
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        continue;
      }
      const body = await response.json().catch(() => ({}));
      const entries = getSocialActionEntries(body);
      entries.forEach(({ urn, payload }) => {
        out.set(urn, parseSocialActionMetrics(payload));
      });
    } catch {
      // Keep returning partial results when a single LinkedIn call fails.
      continue;
    }
  }

  return out;
};

const buildOrgStatsUrl = (orgUrn: string, urns: string[]) => {
  const shareUrns: string[] = [];
  const ugcUrns: string[] = [];
  urns.forEach((urn) => {
    if (urn.includes('ugcPost')) {
      ugcUrns.push(urn);
    } else {
      shareUrns.push(urn);
    }
  });

  const params: string[] = [
    'q=organizationalEntity',
    `organizationalEntity=${encodeURIComponent(orgUrn)}`,
  ];
  if (shareUrns.length > 0) {
    params.push(`shares=List(${shareUrns.map((urn) => encodeURIComponent(urn)).join(',')})`);
  }
  ugcUrns.forEach((urn, index) => {
    params.push(`ugcPosts[${index}]=${encodeURIComponent(urn)}`);
  });
  return `https://api.linkedin.com/rest/organizationalEntityShareStatistics?${params.join('&')}`;
};

const parseOrgStatsMetrics = (stats: any): Partial<LinkedInInteractionMetrics> => ({
  impressionCount: toNumberOrNull(stats?.impressionCount),
  clickCount: toNumberOrNull(stats?.clickCount),
  likeCount: toNumberOrNull(stats?.likeCount),
  commentCount: toNumberOrNull(stats?.commentCount),
  shareCount: toNumberOrNull(stats?.shareCount),
  engagement: toNumberOrNull(stats?.engagement),
  uniqueImpressionsCount: toNumberOrNull(stats?.uniqueImpressionsCount),
});

export const fetchOrganizationShareMetrics = async (
  accessToken: string,
  orgUrn: string,
  urns: string[]
): Promise<Map<string, Partial<LinkedInInteractionMetrics>>> => {
  const out = new Map<string, Partial<LinkedInInteractionMetrics>>();
  const deduped = Array.from(new Set(urns.filter((urn) => urn.startsWith('urn:li:'))));
  if (!orgUrn || deduped.length === 0) return out;

  for (const urnChunk of chunk(deduped, 15)) {
    try {
      const url = buildOrgStatsUrl(orgUrn, urnChunk);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'LinkedIn-Version': LINKEDIN_VERSION,
          'X-Restli-Protocol-Version': '2.0.0',
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        continue;
      }
      const body = await response.json().catch(() => ({}));
      if (!Array.isArray(body?.elements)) {
        continue;
      }
      body.elements.forEach((element: any) => {
        const urn = trimToNull(element?.share) || trimToNull(element?.ugcPost);
        if (!urn) return;
        out.set(decodeSafe(urn), parseOrgStatsMetrics(element?.totalShareStatistics || {}));
      });
    } catch {
      // Keep returning partial results when a single LinkedIn call fails.
      continue;
    }
  }

  return out;
};
