const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

export const LINKEDIN_BASE_SCOPES = [
  'openid',
  'profile',
  'email',
  'w_member_social',
];

export const LINKEDIN_ORG_SCOPES = [
  'r_organization_social',
  'w_organization_social',
  'r_organization_admin',
];

export const getLinkedInScopes = () => {
  const enableOrgScopes = process.env.LINKEDIN_ENABLE_ORG_SCOPES === 'true';
  return (enableOrgScopes
    ? [...LINKEDIN_BASE_SCOPES, ...LINKEDIN_ORG_SCOPES]
    : LINKEDIN_BASE_SCOPES
  ).join(' ');
};

export function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Missing LinkedIn client configuration.');
  }

  return { clientId, clientSecret, redirectUri };
}

export function buildLinkedInAuthUrl(state: string) {
  const { clientId, redirectUri } = getLinkedInConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: getLinkedInScopes(),
    state,
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

export async function exchangeLinkedInCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getLinkedInConfig();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || 'LinkedIn token exchange failed.');
  }

  return data as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    scope?: string;
  };
}
