import { httpClient } from '../../../services/http/httpClient';
import type { InstagramResolvedItem } from '../types';

type IgGateKind = 'requires_login' | 'session_invalid' | 'access_gated';

type ImageCandidate = Readonly<{
  url: string;
  width?: number;
  height?: number;
}>;

type VideoCandidate = Readonly<{
  url: string;
  width?: number;
  height?: number;
  bitrate?: number;
}>;

type ShortcodePayload = {
  graphql?: {
    shortcode_media?: ShortcodeMediaNode;
  };
};

type ShortcodeMediaNode = {
  shortcode?: string;
  is_video?: boolean;
  video_url?: string;
  video_versions?: Array<{
    url?: string;
    width?: number;
    height?: number;
    bitrate?: number;
    bandwidth?: number;
  }>;
  display_url?: string;
  display_resources?: Array<{ src?: string; config_width?: number; config_height?: number }>;
  edge_sidecar_to_children?: {
    edges?: Array<{ node?: ShortcodeMediaNode }>;
  };
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function scoreCandidate(c: VideoCandidate): number {
  const pixels = (c.width ?? 0) * (c.height ?? 0);
  const bitrate = c.bitrate ?? 0;
  const lower = c.url.toLowerCase();
  const bonus = (lower.includes('hd') ? 5_000_000 : 0) + (lower.includes('.mp4') ? 1_000_000 : 0);
  return pixels * 1_000_000 + bitrate + bonus;
}

function scoreImageCandidate(c: ImageCandidate): number {
  return (c.width ?? 0) * (c.height ?? 0);
}

function addCandidate(map: Map<string, VideoCandidate>, c: VideoCandidate): void {
  if (!c.url || !c.url.startsWith('http')) return;
  const existing = map.get(c.url);
  if (!existing) {
    map.set(c.url, c);
    return;
  }

  const existingPixels = (existing.width ?? 0) * (existing.height ?? 0);
  const nextPixels = (c.width ?? 0) * (c.height ?? 0);
  if (nextPixels > existingPixels) {
    map.set(c.url, c);
  }
}

function pickBestVideo(node: ShortcodeMediaNode): string | null {
  const map = new Map<string, VideoCandidate>();

  if (Array.isArray(node.video_versions)) {
    for (const v of node.video_versions) {
      const u = v?.url;
      if (!u) continue;
      const bitrate = typeof v.bitrate === 'number' ? v.bitrate : typeof v.bandwidth === 'number' ? v.bandwidth : undefined;
      addCandidate(map, {
        url: u,
        width: v.width,
        height: v.height,
        bitrate,
      });
    }
  }

  if (node.video_url) {
    addCandidate(map, { url: node.video_url });
  }

  const best = Array.from(map.values()).sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];
  return best?.url ?? node.video_url ?? null;
}

function pickBestImage(node: ShortcodeMediaNode): string | null {
  const resources = node.display_resources;
  if (!resources || resources.length === 0) {
    return node.display_url ?? null;
  }

  const map = new Map<string, ImageCandidate>();
  for (const r of resources) {
    const src = r?.src;
    if (!src) continue;
    map.set(src, { url: src, width: r.config_width, height: r.config_height });
  }

  const best = Array.from(map.values()).sort((a, b) => scoreImageCandidate(b) - scoreImageCandidate(a))[0];
  return best?.url ?? node.display_url ?? null;
}

async function fetchJson(params: Readonly<{ url: string; cookie?: string | null; policy: 'public' | 'session' }>): Promise<{
  ok: boolean;
  status: number;
  json: unknown | null;
  text: string;
  finalUrl: string;
}> {
  const res = await httpClient({
    method: 'GET',
    url: new URL(params.url),
    policy: params.policy,
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

  return {
    ok: res.ok,
    status: res.status,
    json,
    text: res.text,
    finalUrl: res.url,
  };
}

function isShortcodeUrlMatch(resolvedUrl: string, segment: 'p' | 'reel' | 'tv', shortcode: string): boolean {
  try {
    const u = new URL(resolvedUrl);
    const path = u.pathname.replace(/\/+$/, '') + '/';
    return path.toLowerCase().startsWith(`/${segment}/${shortcode.toLowerCase()}/`);
  } catch {
    return false;
  }
}

function isAllowedFinalUrl(kind: 'post' | 'reel' | 'tv', finalUrl: string, shortcode: string): boolean {
  const allowedSegments: Array<'p' | 'reel' | 'tv'> = kind === 'post' ? ['p'] : kind === 'reel' ? ['reel', 'p'] : ['tv', 'p'];
  return allowedSegments.some(seg => isShortcodeUrlMatch(finalUrl, seg, shortcode));
}

function looksLikeAccessGate(text: string): IgGateKind | null {
  const lower = text.toLowerCase();

  if (lower.includes('/accounts/login')) return 'requires_login';
  if (lower.includes('/challenge') || lower.includes('challenge_required')) return 'session_invalid';
  if (lower.includes('/checkpoint') || lower.includes('checkpoint_required')) return 'session_invalid';
  if (lower.includes('/consent') || lower.includes('consent')) return 'access_gated';
  return null;
}

function gateKindFromJson(json: unknown): IgGateKind | null {
  if (!json || typeof json !== 'object') return null;
  const anyJson = json as Record<string, unknown>;

  if (anyJson.require_login === true) return 'requires_login';

  const message = typeof anyJson.message === 'string' ? anyJson.message.toLowerCase() : '';
  const errorType = typeof anyJson.error_type === 'string' ? anyJson.error_type.toLowerCase() : '';

  if (message.includes('login_required') || errorType.includes('login_required')) return 'requires_login';
  if (message.includes('checkpoint_required') || message.includes('challenge_required')) return 'session_invalid';
  if (errorType.includes('checkpoint') || errorType.includes('challenge')) return 'session_invalid';

  return null;
}

function kindToPathSegment(kind: 'post' | 'reel' | 'tv'): 'p' | 'reel' | 'tv' {
  return kind === 'post' ? 'p' : kind;
}

export async function resolvePostReelTvByShortcode(params: Readonly<{ kind: 'post' | 'reel' | 'tv'; shortcode: string; authCookie?: string | null }>): Promise<
  | { kind: 'resolved'; items: readonly InstagramResolvedItem[] }
  | { kind: 'requires_login' }
  | { kind: 'access_gated' }
  | { kind: 'session_invalid' }
  | { kind: 'media_not_found' }
  | { kind: 'shortcode_mismatch' }
  | { kind: 'failed'; reason: 'network' | 'rate_limited' | 'unexpected_response'; cause?: string }
> {
  const { kind, shortcode, authCookie } = params;
  const segment = kindToPathSegment(kind);
  const endpoint = `https://www.instagram.com/${segment}/${encodeURIComponent(shortcode)}/?__a=1&__d=dis`;
  const policy = authCookie ? 'session' : 'public';

  let response: { ok: boolean; status: number; json: unknown | null; text: string; finalUrl: string };
  try {
    response = await fetchJson({ url: endpoint, cookie: authCookie ?? null, policy });
  } catch (e: unknown) {
    return { kind: 'failed', reason: 'network', cause: e instanceof Error ? e.message : undefined };
  }

  if (!isAllowedFinalUrl(kind, response.finalUrl, shortcode)) {
    if (response.finalUrl.toLowerCase().includes('/accounts/login')) {
      return { kind: 'requires_login' };
    }

    if (response.finalUrl.toLowerCase().includes('/challenge') || response.finalUrl.toLowerCase().includes('/checkpoint')) {
      return { kind: 'session_invalid' };
    }

    return { kind: 'shortcode_mismatch' };
  }

  if (response.status === 429) {
    return { kind: 'failed', reason: 'rate_limited' };
  }

  const gateFromText = looksLikeAccessGate(response.text);
  if (gateFromText === 'requires_login') return { kind: 'requires_login' };
  if (gateFromText === 'session_invalid') return { kind: 'session_invalid' };
  if (gateFromText === 'access_gated') return { kind: 'access_gated' };

  if (response.json === null) {
    return { kind: 'failed', reason: 'unexpected_response' };
  }

  const gateFromJson = gateKindFromJson(response.json);
  if (gateFromJson === 'requires_login') return { kind: 'requires_login' };
  if (gateFromJson === 'session_invalid') return { kind: 'session_invalid' };
  if (gateFromJson === 'access_gated') return { kind: 'access_gated' };

  if (response.status === 404) {
    return { kind: 'media_not_found' };
  }

  const payload = response.json as ShortcodePayload;
  const node = payload.graphql?.shortcode_media;
  if (!node) {
    if (kind !== 'post') {
      const fallbackEndpoint = `https://www.instagram.com/p/${encodeURIComponent(shortcode)}/?__a=1&__d=dis`;
      let fb: { ok: boolean; status: number; json: unknown | null; text: string; finalUrl: string };
      try {
        fb = await fetchJson({ url: fallbackEndpoint, cookie: authCookie ?? null, policy });
      } catch (e: unknown) {
        return { kind: 'failed', reason: 'network', cause: e instanceof Error ? e.message : undefined };
      }

      if (!isAllowedFinalUrl('post', fb.finalUrl, shortcode)) {
        if (fb.finalUrl.toLowerCase().includes('/accounts/login')) return { kind: 'requires_login' };
        if (fb.finalUrl.toLowerCase().includes('/challenge') || fb.finalUrl.toLowerCase().includes('/checkpoint')) {
          return { kind: 'session_invalid' };
        }
        return { kind: 'shortcode_mismatch' };
      }

      if (fb.status === 429) return { kind: 'failed', reason: 'rate_limited' };

      const fbGateFromText = looksLikeAccessGate(fb.text);
      if (fbGateFromText === 'requires_login') return { kind: 'requires_login' };
      if (fbGateFromText === 'session_invalid') return { kind: 'session_invalid' };
      if (fbGateFromText === 'access_gated') return { kind: 'access_gated' };

      if (fb.json === null) {
        return { kind: 'failed', reason: 'unexpected_response' };
      }

      const fbGateFromJson = gateKindFromJson(fb.json);
      if (fbGateFromJson === 'requires_login') return { kind: 'requires_login' };
      if (fbGateFromJson === 'session_invalid') return { kind: 'session_invalid' };
      if (fbGateFromJson === 'access_gated') return { kind: 'access_gated' };

      if (fb.status === 404) return { kind: 'media_not_found' };

      const fbPayload = fb.json as ShortcodePayload;
      const fbNode = fbPayload.graphql?.shortcode_media;
      if (!fbNode) return { kind: 'failed', reason: 'unexpected_response' };

      return await resolvePostReelTvByShortcode({ kind: 'post', shortcode, authCookie });
    }

    return { kind: 'failed', reason: 'unexpected_response' };
  }

  const base = `instagram_${shortcode}`;

  if (typeof node.shortcode === 'string' && node.shortcode && node.shortcode !== shortcode) {
    return { kind: 'shortcode_mismatch' };
  }

  const edges = node.edge_sidecar_to_children?.edges;
  if (Array.isArray(edges) && edges.length > 0) {
    const items: InstagramResolvedItem[] = [];
    for (let i = 0; i < edges.length; i += 1) {
      const child = edges[i]?.node;
      if (!child) {
        return { kind: 'failed', reason: 'unexpected_response' };
      }

      if (child.is_video) {
        const best = pickBestVideo(child);
        if (!best) return { kind: 'failed', reason: 'unexpected_response' };
        items.push({
          kind: 'video',
          url: new URL(best),
          suggestedFilename: `${base}_${pad2(i + 1)}.mp4`,
        });
      } else {
        const best = pickBestImage(child);
        if (!best) return { kind: 'failed', reason: 'unexpected_response' };
        items.push({
          kind: 'image',
          url: new URL(best),
          suggestedFilename: `${base}_${pad2(i + 1)}.jpg`,
        });
      }
    }

    return { kind: 'resolved', items };
  }

  if (node.is_video) {
    const best = pickBestVideo(node);
    if (!best) return { kind: 'failed', reason: 'unexpected_response' };
    return {
      kind: 'resolved',
      items: [
        {
          kind: 'video',
          url: new URL(best),
          suggestedFilename: `${base}.mp4`,
        },
      ],
    };
  }

  const best = pickBestImage(node);
  if (!best) return { kind: 'failed', reason: 'unexpected_response' };
  return {
    kind: 'resolved',
    items: [
      {
        kind: 'image',
        url: new URL(best),
        suggestedFilename: `${base}.jpg`,
      },
    ],
  };
}
