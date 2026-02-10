const normalizeSiteUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return null;
  }
};

const resolveSiteUrl = () =>
  normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
  normalizeSiteUrl(process.env.URL) ||
  normalizeSiteUrl(process.env.DEPLOY_PRIME_URL) ||
  normalizeSiteUrl(process.env.DEPLOY_URL) ||
  normalizeSiteUrl(process.env.SITE_URL);

export const handler = async () => {
  const siteUrl = resolveSiteUrl();
  const secret = process.env.LINKEDIN_SCHEDULER_SECRET;

  if (!siteUrl || !secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          'Missing scheduler configuration. Expected LINKEDIN_SCHEDULER_SECRET and one of NEXT_PUBLIC_SITE_URL/URL/DEPLOY_PRIME_URL/DEPLOY_URL/SITE_URL.',
      }),
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const response = await fetch(`${siteUrl}/api/linkedin/run-scheduled`, {
      method: 'POST',
      headers: {
        'x-scheduler-secret': secret,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data?.error || 'Scheduler call failed.', details: data }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ...data, schedulerSiteUrl: siteUrl }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Scheduler failed.', schedulerSiteUrl: siteUrl }),
    };
  }
};
