export type InstagramMediaKind = 'image' | 'video';

export type InstagramAuth = Readonly<{
  cookie: string;
}>;

export type InstagramResolvedItem = Readonly<{
  kind: InstagramMediaKind;
  url: URL;
  suggestedFilename: string;
  headers?: Readonly<Record<string, string>>;
}>;

export type InstagramNormalizedUrl = Readonly<{
  url: URL;
  type:
    | Readonly<{ kind: 'post' | 'reel' | 'tv'; shortcode: string }>
    | Readonly<{ kind: 'story'; username: string; storyPk: string }>
    | Readonly<{ kind: 'unknown' }>;
}>;

export type InstagramResolveResult =
  | Readonly<{
      kind: 'resolved';
      items: readonly InstagramResolvedItem[];
    }>
  | Readonly<{
      kind: 'requires_login';
      reason: 'story_requires_auth' | 'private_or_login_wall';
    }>
  | Readonly<{
      kind: 'session_invalid';
    }>
  | Readonly<{
      kind: 'access_gated';
    }>
  | Readonly<{
      kind: 'unsupported';
      reason: 'unknown_url' | 'not_instagram';
    }>
  | Readonly<{
      kind: 'media_not_found';
    }>
  | Readonly<{
      kind: 'shortcode_mismatch';
    }>
  | Readonly<{
      kind: 'failed';
      reason: 'network' | 'rate_limited' | 'unexpected_response';
      cause?: string;
    }>;
