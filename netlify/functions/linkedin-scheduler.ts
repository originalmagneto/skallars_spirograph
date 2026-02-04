export const handler = async () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.LINKEDIN_SCHEDULER_SECRET;

  if (!siteUrl || !secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing NEXT_PUBLIC_SITE_URL or LINKEDIN_SCHEDULER_SECRET.' }),
    };
  }

  try {
    const response = await fetch(`${siteUrl.replace(/\/$/, '')}/api/linkedin/run-scheduled`, {
      method: 'POST',
      headers: {
        'x-scheduler-secret': secret,
      },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data?.error || 'Scheduler call failed.', details: data }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error?.message || 'Scheduler failed.' }),
    };
  }
};
