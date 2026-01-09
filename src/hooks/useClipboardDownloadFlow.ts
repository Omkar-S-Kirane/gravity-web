import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { resolveInstagramMedia } from '../core/instagram';
import type { DownloadProgress } from '../services/downloader/DownloaderService';
import { createClipboardService } from '../services/clipboard/ClipboardService';
import { createDownloaderService } from '../services/downloader/WebDownloader';
import { AppError } from '../services/errors/AppError';
import { loadInstagramAuthCookie } from '../services/instagramAuth/authStorage';
import { parseHttpUrl } from '../utils/url';
import { useToast } from '../components/toast/ToastProvider';
import {
  toastForDownloadStarted,
  toastForDownloadSuccess,
  toastForError,
  toastForInstagramResult,
  toastForInvalidClipboardUrl,
} from '../toast/toastMapping';

type FlowState = Readonly<{
  isBusy: boolean;
  isResolving: boolean;
  progress: DownloadProgress | null;
  progressPercent: number | null;
}>;

type Params = Readonly<{
  onStoryAuthRequired?: () => void;
}>;

type ManualPasteState = Readonly<{
  isOpen: boolean;
  open: () => void;
  close: () => void;
  submit: (text: string) => Promise<void>;
}>;

async function downloadResolved(params: Readonly<{
  items: readonly Readonly<{ url: URL; suggestedFilename: string; headers?: Readonly<Record<string, string>> }>[],
  onProgress?: (p: DownloadProgress) => void,
  downloader: ReturnType<typeof createDownloaderService>,
}>): Promise<void> {
  const items = params.items;
  if (!items || items.length === 0) {
    throw new AppError({ code: 'download_not_resolved' });
  }

  const downloadItems = items.map(i => ({
    url: i.url,
    filename: i.suggestedFilename,
    headers: i.headers,
  }));

  if (params.downloader.downloadManyToDownloads) {
    await params.downloader.downloadManyToDownloads({ items: downloadItems, onProgress: params.onProgress }).promise;
    return;
  }

  for (let i = 0; i < downloadItems.length; i += 1) {
    const item = downloadItems[i];
    const task = params.downloader.downloadToDownloads({
      url: item.url,
      filename: item.filename,
      headers: item.headers,
      onProgress: params.onProgress,
    });
    await task.promise;
  }
}

export function useClipboardDownloadFlow(params?: Params) {
  const { show } = useToast();
  const clipboard = useMemo(() => createClipboardService(), []);
  const downloader = useMemo(() => createDownloaderService(), []);
  const [isBusy, setIsBusy] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);

  const isMounted = useRef(true);
  const isBusyRef = useRef(false);
  const lastProgressRef = useRef<DownloadProgress | null>(null);

  const setProgressIfChanged = useCallback((next: DownloadProgress | null) => {
    const prev = lastProgressRef.current;
    const equal =
      prev === next ||
      (prev !== null &&
        next !== null &&
        prev.receivedBytes === next.receivedBytes &&
        prev.totalBytes === next.totalBytes &&
        prev.fraction === next.fraction);

    if (equal) return;
    lastProgressRef.current = next;
    setProgress(next);
  }, []);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(
    async (text: string) => {
      const parsed = parseHttpUrl(text);
      if (!parsed) {
        show(toastForInvalidClipboardUrl());
        return;
      }

      const path = parsed.url.pathname.toLowerCase();
      const isStory = path.startsWith('/stories/');
      const cookie = isStory ? await loadInstagramAuthCookie() : null;
      const resolution = await resolveInstagramMedia({ url: parsed.url, authCookie: cookie });

      if (isMounted.current) {
        setIsResolving(false);
      }

      const toast = toastForInstagramResult(resolution);
      if (toast) {
        show(toast);

        if (resolution.kind === 'requires_login' && resolution.reason === 'story_requires_auth') {
          params?.onStoryAuthRequired?.();
        }
        return;
      }

      if (resolution.kind !== 'resolved') {
        show(toastForInvalidClipboardUrl());
        return;
      }

      show(toastForDownloadStarted());

      await downloadResolved({
        items: resolution.items,
        downloader,
        onProgress: p => {
          if (isMounted.current) {
            setProgressIfChanged(p);
          }
        },
      });

      show(toastForDownloadSuccess({ count: resolution.items.length }));
      setProgressIfChanged(null);
    },
    [downloader, setProgressIfChanged, show],
  );

  const runWithText = useCallback(
    async (text: string) => {
      if (isBusyRef.current) return;
      isBusyRef.current = true;

      setIsBusy(true);
      setIsResolving(true);
      setProgressIfChanged(null);

      try {
        await execute(text);
      } catch (e: unknown) {
        show(toastForError(e));
        setProgressIfChanged(null);
        if (isMounted.current) {
          setIsResolving(false);
        }
      } finally {
        if (isMounted.current) {
          setIsBusy(false);
          setIsResolving(false);
        }
        isBusyRef.current = false;
      }
    },
    [execute, setProgressIfChanged, show],
  );

  const run = useCallback(async () => {
    if (isBusyRef.current) return;
    isBusyRef.current = true;

    setIsBusy(true);
    setIsResolving(true);
    setProgressIfChanged(null);

    try {
      let text: string;
      try {
        text = await clipboard.getString();
      } catch (e: unknown) {
        show(toastForError(e));
        setPasteOpen(true);
        return;
      }

      await execute(text);
    } catch (e: unknown) {
      show(toastForError(e));
      setProgressIfChanged(null);
      if (isMounted.current) {
        setIsResolving(false);
      }
    } finally {
      if (isMounted.current) {
        setIsBusy(false);
        setIsResolving(false);
      }
      isBusyRef.current = false;
    }
  }, [clipboard, execute, setProgressIfChanged, show]);

  const progressPercent = useMemo(() => {
    const fraction = progress?.fraction;
    if (fraction === null || fraction === undefined) return null;
    return Math.max(0, Math.min(100, Math.round(fraction * 100)));
  }, [progress?.fraction]);

  const manualPaste: ManualPasteState = useMemo(
    () => ({
      isOpen: pasteOpen,
      open: () => setPasteOpen(true),
      close: () => setPasteOpen(false),
      submit: async (text: string) => {
        setPasteOpen(false);
        await runWithText(text);
      },
    }),
    [pasteOpen, runWithText],
  );

  return {
    state: { isBusy, isResolving, progress, progressPercent } satisfies FlowState,
    run,
    manualPaste,
  } as const;
}
