import type { InstagramNormalizedUrl } from '../types';

function normalizeInstagramHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
}

function normalizeTrailingSlash(pathname: string): string {
  const stripped = pathname.replace(/\/+$/, '');
  return stripped.endsWith('/') ? stripped : `${stripped}/`;
}

function dropTrackingParams(url: URL): void {
  const keys: string[] = [];
  for (const [k] of url.searchParams) {
    keys.push(k);
  }

  for (const key of keys) {
    const lower = key.toLowerCase();
    if (lower === 'igsh') url.searchParams.delete(key);
    else if (lower === 'fbclid') url.searchParams.delete(key);
    else if (lower === '__a') url.searchParams.delete(key);
    else if (lower === '__d') url.searchParams.delete(key);
    else if (lower.startsWith('utm_')) url.searchParams.delete(key);
  }
}

export function normalizeInstagramUrl(input: URL): InstagramNormalizedUrl {
  const url = new URL(input.toString());
  url.hash = '';
  url.protocol = 'https:';

  const host = normalizeInstagramHostname(url.hostname);
  if (host === 'instagram.com') {
    url.hostname = 'instagram.com';
  }

  dropTrackingParams(url);
  url.pathname = normalizeTrailingSlash(url.pathname);

  const parts = url.pathname.split('/').filter(Boolean);
  const p0 = (parts[0] ?? '').toLowerCase();

  if (parts.length >= 3 && p0 === 'stories') {
    const username = parts[1] ?? '';
    const storyPk = parts[2] ?? '';
    return {
      url,
      type: username && storyPk ? { kind: 'story', username, storyPk } : { kind: 'unknown' },
    };
  }

  if (parts.length >= 2 && (p0 === 'p' || p0 === 'reel' || p0 === 'tv')) {
    const shortcode = parts[1] ?? '';
    return {
      url,
      type:
        shortcode
          ? {
              kind: p0 === 'p' ? 'post' : (p0 as 'reel' | 'tv'),
              shortcode,
            }
          : { kind: 'unknown' },
    };
  }

  return { url, type: { kind: 'unknown' } };
}

export function isInstagramHost(url: URL): boolean {
  return normalizeInstagramHostname(url.hostname) === 'instagram.com';
}
