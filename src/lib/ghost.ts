import GhostContentAPI from '@tryghost/content-api';

export type GhostPost = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  feature_image?: string | null;
  feature_image_alt?: string | null;
  published_at?: string;
  html?: string | null;
  reading_time?: number;
  tags?: Array<{ name: string; slug: string }>; // simplified
};

export function getGhost() {
  const apiUrl = process.env.GHOST_CONTENT_API_URL;
  const apiKey = process.env.GHOST_CONTENT_API_KEY;
  if (!apiUrl || !apiKey) {
    return null;
  }
  return new GhostContentAPI({
    url: apiUrl,
    key: apiKey,
    version: 'v5.0',
  });
}


