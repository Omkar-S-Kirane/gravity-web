import type { InstagramResolveResult } from '../core/instagram';
import { toAppError } from '../services/errors/AppError';
import type { ToastPayload } from '../components/toast/ToastProvider';

type UnsupportedReason = Extract<InstagramResolveResult, { kind: 'unsupported' }>['reason'];

export function toastForInvalidClipboardUrl(): ToastPayload {
  return {
    title: 'No valid link found',
    message: 'Copy a URL to your clipboard and try again.',
    variant: 'info',
  };
}

export function toastForUnsupported(res: Readonly<{ reason: UnsupportedReason }>): ToastPayload {
  if (res.reason === 'not_instagram') {
    return {
      title: 'Unsupported link',
      message: 'Only Instagram links are supported in this web build.',
      variant: 'info',
    };
  }

  return {
    title: 'Unsupported link',
    message: 'Try a public Instagram post, reel, or story link.',
    variant: 'info',
  };
}

export function toastForDownloadStarted(): ToastPayload {
  return {
    title: 'Downloading…',
    message: 'Saving to Downloads.',
    variant: 'info',
  };
}

export function toastForDownloadSuccess(params?: Readonly<{ count?: number }>): ToastPayload {
  const count = params?.count;
  const noun = typeof count === 'number' ? `${count} item${count === 1 ? '' : 's'}` : 'items';
  return {
    title: 'Saved',
    message: `Saved ${noun} to Downloads.`,
    variant: 'success',
  };
}

export function toastForInstagramResult(result: InstagramResolveResult): ToastPayload | null {
  switch (result.kind) {
    case 'resolved':
      return null;
    case 'unsupported':
      return toastForUnsupported({ reason: result.reason });
    case 'requires_login':
      return {
        title: result.reason === 'story_requires_auth' ? 'Login required for stories' : 'Requires login',
        message:
          result.reason === 'story_requires_auth'
            ? 'Instagram stories require an authenticated session. Add a session cookie and try again.'
            : 'This link appears to require login. Only publicly accessible links are supported.',
        variant: 'info',
      };
    case 'media_not_found':
      return {
        title: 'Media not found',
        message: 'This post/reel/story could not be found (deleted, expired, or URL is invalid).',
        variant: 'info',
      };
    case 'shortcode_mismatch':
      return {
        title: 'Link resolved to different media',
        message:
          'Instagram returned data for a different post than the shortcode in your link. Nothing was downloaded to avoid saving the wrong media.',
        variant: 'info',
      };
    case 'session_invalid':
      return {
        title: 'Session invalid',
        message: 'Your session appears to be invalid or challenged. Refresh your cookie and try again.',
        variant: 'info',
      };
    case 'access_gated':
      return {
        title: 'Access gated',
        message: 'Instagram blocked this request (consent/region gate). Try again later.',
        variant: 'info',
      };
    case 'failed':
      if (result.reason === 'rate_limited') {
        return {
          title: 'Temporarily rate limited',
          message: 'Instagram rate-limited this request. Wait a bit and try again.',
          variant: 'info',
        };
      }
      return {
        title: 'Could not resolve link',
        message: result.reason === 'network' ? 'Network error. Please try again.' : 'Unexpected response. Please try again.',
        variant: 'error',
      };
    default:
      return {
        title: 'Could not resolve link',
        message: 'Please try again.',
        variant: 'error',
      };
  }
}

export function toastForError(err: unknown): ToastPayload {
  const appError = toAppError(err);
  const causeText = typeof appError.cause === 'string' ? appError.cause : undefined;

  switch (appError.code) {
    case 'clipboard_unavailable':
      return {
        title: 'Clipboard unavailable',
        message: 'Paste a link instead or allow clipboard permission in your browser.',
        variant: 'info',
      };
    case 'clipboard_empty':
      return {
        title: 'Clipboard is empty',
        message: 'Copy a link first, then tap the button again.',
        variant: 'info',
      };
    case 'invalid_url':
      return toastForInvalidClipboardUrl();
    case 'download_http_error':
      return {
        title: 'Download failed',
        message: causeText ? `The server responded with an error (${causeText}). Please try again.` : 'The server responded with an error. Please try again.',
        variant: 'error',
      };
    case 'download_write_failed':
      return {
        title: 'Save failed',
        message: 'The file could not be saved to a user-visible location. Please try again.',
        variant: 'error',
      };
    case 'download_partial_failed':
      return {
        title: 'Some items failed',
        message: causeText ? `${causeText}. Some items may have been saved.` : 'Some items failed to download. Some items may have been saved.',
        variant: 'error',
      };
    case 'unknown':
    default:
      return {
        title: 'Something went wrong',
        message: 'Please try again.',
        variant: 'error',
      };
  }
}
