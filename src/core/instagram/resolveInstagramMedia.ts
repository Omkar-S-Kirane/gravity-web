import type { InstagramAuth, InstagramResolveResult } from './types';
import { isInstagramHost, normalizeInstagramUrl } from './resolvers/UrlNormalizer';
import { resolvePostReelTvByShortcode } from './resolvers/PostReelResolver';
import { resolveStoryByUsernameAndPk, resolveStoryPublicByUsernameAndPk } from './resolvers/StoryResolver';

export type ResolveInstagramMediaParams = Readonly<{
  url: URL;
  authCookie?: string | null;
}>;

export async function resolveInstagramMedia(params: ResolveInstagramMediaParams): Promise<InstagramResolveResult> {
  const { url, authCookie } = params;

  if (!isInstagramHost(url)) {
    return { kind: 'unsupported', reason: 'not_instagram' };
  }

  const normalized = normalizeInstagramUrl(url);

  if (normalized.type.kind === 'post' || normalized.type.kind === 'reel' || normalized.type.kind === 'tv') {
    const result = await resolvePostReelTvByShortcode({
      kind: normalized.type.kind,
      shortcode: normalized.type.shortcode,
      // Web parity: public posts/reels must not depend on (or be broken by) a stored session cookie.
      // Stories are the only media type that should use authCookie.
      authCookie: null,
    });

    if (result.kind === 'resolved') return { kind: 'resolved', items: result.items };
    if (result.kind === 'requires_login') return { kind: 'requires_login', reason: 'private_or_login_wall' };
    if (result.kind === 'session_invalid') return { kind: 'session_invalid' };
    if (result.kind === 'access_gated') return { kind: 'access_gated' };
    if (result.kind === 'media_not_found') return { kind: 'media_not_found' };
    if (result.kind === 'shortcode_mismatch') return { kind: 'shortcode_mismatch' };
    return { kind: 'failed', reason: result.reason, cause: result.cause };
  }

  if (normalized.type.kind === 'story') {
    const auth: InstagramAuth | undefined = authCookie ? { cookie: authCookie } : undefined;

    if (!auth?.cookie) {
      const publicStory = await resolveStoryPublicByUsernameAndPk({
        username: normalized.type.username,
        storyPk: normalized.type.storyPk,
      });

      if (publicStory.kind === 'resolved') {
        return { kind: 'resolved', items: publicStory.items };
      }

      if (publicStory.kind === 'media_not_found') {
        return { kind: 'media_not_found' };
      }

      if (publicStory.kind === 'requires_login') {
        return { kind: 'requires_login', reason: 'story_requires_auth' };
      }

      return { kind: 'failed', reason: publicStory.reason, cause: publicStory.cause };
    }

    const story = await resolveStoryByUsernameAndPk({
      username: normalized.type.username,
      storyPk: normalized.type.storyPk,
      auth,
    });

    if (story.kind === 'resolved') return { kind: 'resolved', items: story.items };
    if (story.kind === 'requires_login') return { kind: 'requires_login', reason: 'story_requires_auth' };

    if (story.reason === 'unexpected_response' && story.cause === 'story_not_found_or_expired') {
      return { kind: 'media_not_found' };
    }

    return { kind: 'failed', reason: story.reason, cause: story.cause };
  }

  return { kind: 'unsupported', reason: 'unknown_url' };
}
