import { AppError } from '../errors/AppError';

export type ClipboardService = Readonly<{
  getString: () => Promise<string>;
}>;

export function createClipboardService(): ClipboardService {
  return {
    getString: async () => {
      if (!('clipboard' in navigator)) {
        throw new AppError({ code: 'clipboard_unavailable' });
      }

      let text: string;
      try {
        text = await navigator.clipboard.readText();
      } catch (cause: unknown) {
        throw new AppError({ code: 'clipboard_unavailable', cause });
      }

      if (typeof text !== 'string' || text.trim().length === 0) {
        throw new AppError({ code: 'clipboard_empty' });
      }

      return text;
    },
  };
}
