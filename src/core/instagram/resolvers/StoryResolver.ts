import { httpClient } from '../../../services/http/httpClient';
import type { InstagramAuth, InstagramResolvedItem } from '../types';

type WebProfileInfoResponse = {
  data?: {
    user?: {
      id?: string;
    };
  };
};

type StoryTrayResponse = {
  reel?: {
    items?: Array<{
      pk?: string | number;
      id?: string | number;
      media_type?: number;
      video_versions?: Array<{ url?: string; width?: number; height?: number; bitrate?: number }>;
      image_versions2?: { candidates?: Array<{ url?: string; width?: number; height?: number }> };
    }>;
  };
};

type PublicStoryWebResponse = {
  require_login?: boolean;
  reels_media?: Array<{
    items?: Array<{
      pk?: string | number;
      id?: string | number;
      media_type?: number;
      video_versions?: Array<{ url?: string; width?: number; height?: number; bitrate?: number }>;
      image_versions2?: { candidates?: Array<{ url?: string; width?: number; height?: number }> };
    }>;
  }>;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function normalizeStoryId(v: string): string {
  const trimmed = v.trim();
  const idx = trimmed.indexOf('_');
  return idx >= 0 ? trimmed.slice(0, idx) : trimmed;
}

function getCookieValue(cookie: string, key: string): string | null {
  const parts = cookie.split(';');
  for (const p of parts) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    if (k !== key) continue;
    return trimmed.slice(eq + 1).trim() || null;
  }
  return null;
}

function looksLikeLoginRequiredJson(json: unknown): boolean {
  if (typeof json !== 'object' || json === null) return false;
  const rec = json as Record<string, unknown>;
  const message = typeof rec.message === 'string' ? rec.message : '';
  const errorType = typeof rec.error_type === 'string' ? rec.error_type : '';
  const status = typeof rec.status === 'string' ? rec.status : '';
  const combined = `${message} ${errorType} ${status}`.toLowerCase();
  return (
    combined.includes('login_required') ||
    combined.includes('checkpoint_required') ||
    combined.includes('challenge_required') ||
    combined.includes('feedback_required')
  );
}

async function fetchJson(params: Readonly<{ url: string; cookie?: string | null }>): Promise<{ status: number; json: unknown | null; text: string }> {
  const res = await httpClient({
    method: 'GET',
    url: new URL(params.url),
    policy: 'story',
    headers: {
      accept: 'application/json,text/plain,*/*',
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0',
      'x-ig-app-id': '936619743392459',
      'x-ig-www-claim': '0',
      'x-requested-with': 'XMLHttpRequest',
      ...(params.cookie ? { cookie: params.cookie } : null),
    },
  });

  let json: unknown | null = null;
  try {
    json = JSON.parse(res.text) as unknown;
  } catch {
    json = null;
  }

  return { status: res.status, json, text: res.text };
}

function scoreVideo(c: Readonly<{ width?: number; height?: number; bitrate?: number }>): number {
  const pixels = (c.width ?? 0) * (c.height ?? 0);
  return pixels * 1_000_000 + (c.bitrate ?? 0);
}

function pickBestVideoUrl(versions?: Array<{ url?: string; width?: number; height?: number; bitrate?: number }>): string | null {
  if (!Array.isArray(versions) || versions.length === 0) return null;
  const candidates: Array<{ url: string; width?: number; height?: number; bitrate?: number }> = [];
  for (const v of versions) {
    const url = v?.url;
    if (typeof url !== 'string' || !url) continue;
    candidates.push({ url, width: v.width, height: v.height, bitrate: v.bitrate });
  }

  const best = candidates.sort((a, b) => scoreVideo(b) - scoreVideo(a))[0];
  return best?.url ?? null;
}

function pickBestImageUrl(candidates?: Array<{ url?: string; width?: number; height?: number }>): string | null {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const map = new Map<string, { url: string; width?: number; height?: number }>();
  for (const c of candidates) {
    const url = c?.url;
    if (!url) continue;
    const existing = map.get(url);
    if (!existing) {
      map.set(url, { url, width: c.width, height: c.height });
      continue;
    }
    const existingPixels = (existing.width ?? 0) * (existing.height ?? 0);
    const nextPixels = (c.width ?? 0) * (c.height ?? 0);
    if (nextPixels > existingPixels) {
      map.set(url, { url, width: c.width, height: c.height });
    }
  }

  const best = Array.from(map.values()).sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0))[0];
  return best?.url ?? null;
}

function mapStoryItemsToResolved(items: Array<{
  pk?: string | number;
  id?: string | number;
  media_type?: number;
  video_versions?: Array<{ url?: string; width?: number; height?: number; bitrate?: number }>;
  image_versions2?: { candidates?: Array<{ url?: string; width?: number; height?: number }> };
}>): readonly InstagramResolvedItem[] | null {
  const out: InstagramResolvedItem[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    const mediaType = it.media_type;

    const base = it.id ?? it.pk ?? String(i + 1);
    const baseName = `instagram_story_${String(base)}`;

    if (mediaType === 2) {
      const best = pickBestVideoUrl(it.video_versions);
      if (!best) return null;
      out.push({
        kind: 'video',
        url: new URL(best),
        suggestedFilename: `${baseName}_${pad2(i + 1)}.mp4`,
      });
      continue;
    }

    const bestImg = pickBestImageUrl(it.image_versions2?.candidates);
    if (!bestImg) return null;
    out.push({
      kind: 'image',
      url: new URL(bestImg),
      suggestedFilename: `${baseName}_${pad2(i + 1)}.jpg`,
    });
  }

  return out.length > 0 ? out : null;
}

export async function resolveStoryPublicByUsernameAndPk(params: Readonly<{ username: string; storyPk: string }>): Promise<
  | { kind: 'resolved'; items: readonly InstagramResolvedItem[] }
  | { kind: 'requires_login' }
  | { kind: 'media_not_found' }
  | { kind: 'failed'; reason: 'network' | 'unexpected_response'; cause?: string }
> {
  const storyId = normalizeStoryId(params.storyPk);

  const endpoint = `https://i.instagram.com/api/v1/feed/reels_media/?reel_ids=${encodeURIComponent(storyId)}`;

  let res: { status: number; json: unknown | null; text: string };
  try {
    res = await fetchJson({ url: endpoint });
  } catch (e: unknown) {
    return { kind: 'failed', reason: 'network', cause: e instanceof Error ? e.message : undefined };
  }

  if (res.json && looksLikeLoginRequiredJson(res.json)) {
    return { kind: 'requires_login' };
  }

  const payload = res.json as PublicStoryWebResponse | null;
  if (!payload || typeof payload !== 'object') {
    return { kind: 'failed', reason: 'unexpected_response' };
  }

  if (payload.require_login === true) {
    return { kind: 'requires_login' };
  }

  const items = payload.reels_media?.[0]?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { kind: 'media_not_found' };
  }

  const mapped = mapStoryItemsToResolved(items);
  if (!mapped) {
    return { kind: 'failed', reason: 'unexpected_response' };
  }

  return { kind: 'resolved', items: mapped };
}

export async function resolveStoryByUsernameAndPk(params: Readonly<{ username: string; storyPk: string; auth: InstagramAuth }>): Promise<
  | { kind: 'resolved'; items: readonly InstagramResolvedItem[] }
  | { kind: 'requires_login' }
  | { kind: 'failed'; reason: 'network' | 'unexpected_response'; cause?: string }
> {
  const cookie = params.auth.cookie;
  const sessionId = getCookieValue(cookie, 'sessionid');

  if (!sessionId) {
    return { kind: 'requires_login' };
  }

  const username = params.username.trim();
  if (!username) {
    return { kind: 'failed', reason: 'unexpected_response' };
  }

  const profileEndpoint = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;

  let profile: { status: number; json: unknown | null; text: string };
  try {
    profile = await fetchJson({ url: profileEndpoint, cookie });
  } catch (e: unknown) {
    return { kind: 'failed', reason: 'network', cause: e instanceof Error ? e.message : undefined };
  }

  if (profile.json && looksLikeLoginRequiredJson(profile.json)) {
    return { kind: 'requires_login' };
  }

  const profilePayload = profile.json as WebProfileInfoResponse | null;
  const userId = profilePayload?.data?.user?.id;
  if (!userId) {
    return { kind: 'requires_login' };
  }

  const trayEndpoint = `https://i.instagram.com/api/v1/feed/reels_tray/?supported_capabilities_new=true&include_persistent=true&reel_ids=${encodeURIComponent(
    userId,
  )}`;

  let tray: { status: number; json: unknown | null; text: string };
  try {
    tray = await fetchJson({ url: trayEndpoint, cookie });
  } catch (e: unknown) {
    return { kind: 'failed', reason: 'network', cause: e instanceof Error ? e.message : undefined };
  }

  if (tray.json && looksLikeLoginRequiredJson(tray.json)) {
    return { kind: 'requires_login' };
  }

  const trayPayload = tray.json as StoryTrayResponse | null;
  const items = trayPayload?.reel?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return { kind: 'failed', reason: 'unexpected_response', cause: 'story_not_found_or_expired' };
  }

  const normalizedPk = normalizeStoryId(params.storyPk);
  const filtered = items.filter(it => {
    const pk = typeof it.pk === 'string' || typeof it.pk === 'number' ? String(it.pk) : '';
    return normalizeStoryId(pk) === normalizedPk;
  });

  const mapped = mapStoryItemsToResolved(filtered.length > 0 ? filtered : items);
  if (!mapped) {
    return { kind: 'failed', reason: 'unexpected_response' };
  }

  return { kind: 'resolved', items: mapped };
}
