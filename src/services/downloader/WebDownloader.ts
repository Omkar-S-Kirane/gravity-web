import { AppError } from '../errors/AppError';
import type {
  DownloadItem,
  DownloadProgress,
  DownloadResult,
  DownloadTask,
  DownloaderService,
} from './DownloaderService';

function pickFilenameFromHeaders(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;
  const m = /filename\*=UTF-8''(?<name>[^;]+)|filename="?(?<name2>[^";]+)"?/i.exec(contentDisposition);
  const raw = m?.groups?.name ?? m?.groups?.name2;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function safeClickDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 30_000);
}

async function fetchWithProgress(params: Readonly<{
  url: URL;
  headers?: Readonly<Record<string, string>>;
  signal: AbortSignal;
  onProgress?: (p: DownloadProgress) => void;
}>): Promise<{ blob: Blob; filenameFromServer: string | null }> {
  const res = await fetch(params.url.toString(), {
    method: 'GET',
    headers: params.headers,
    signal: params.signal,
  });

  if (!res.ok) {
    throw new AppError({ code: 'download_http_error', cause: String(res.status) });
  }

  const totalBytes = (() => {
    const v = res.headers.get('content-length');
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const filenameFromServer = pickFilenameFromHeaders(res.headers.get('content-disposition'));

  const body = res.body;
  if (!body) {
    const blob = await res.blob();
    params.onProgress?.({ receivedBytes: blob.size, totalBytes: totalBytes ?? blob.size, fraction: 1 });
    return { blob, filenameFromServer };
  }

  const reader = body.getReader();
  const chunks: ArrayBuffer[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      const buf = new ArrayBuffer(value.byteLength);
      new Uint8Array(buf).set(value);
      chunks.push(buf);
      receivedBytes += value.byteLength;
      const fraction = totalBytes ? receivedBytes / totalBytes : null;
      params.onProgress?.({ receivedBytes, totalBytes, fraction });
    }
  }

  const blob = new Blob(chunks);
  params.onProgress?.({ receivedBytes: blob.size, totalBytes: totalBytes ?? blob.size, fraction: 1 });
  return { blob, filenameFromServer };
}

function downloadOne(params: Readonly<{
  url: URL;
  filename: string;
  headers?: Readonly<Record<string, string>>;
  onProgress?: (p: DownloadProgress) => void;
}>): DownloadTask {
  const controller = new AbortController();

  const promise = (async (): Promise<DownloadResult> => {
    const { blob, filenameFromServer } = await fetchWithProgress({
      url: params.url,
      headers: params.headers,
      signal: controller.signal,
      onProgress: params.onProgress,
    });

    const finalName = filenameFromServer ?? params.filename;

    try {
      safeClickDownload(blob, finalName);
    } catch (cause: unknown) {
      throw new AppError({ code: 'download_write_failed', cause });
    }

    return { filename: finalName };
  })();

  return {
    promise,
    cancel: () => {
      controller.abort();
    },
  };
}

function downloadMany(params: Readonly<{ items: readonly DownloadItem[]; onProgress?: (p: DownloadProgress) => void }>): DownloadTask {
  const controller = new AbortController();

  const promise = (async (): Promise<DownloadResult> => {
    const total = params.items.length;
    let lastResult: DownloadResult | null = null;
    const failures: string[] = [];

    for (let i = 0; i < params.items.length; i += 1) {
      const item = params.items[i];
      const wrappedOnProgress = params.onProgress
        ? (p: DownloadProgress) => {
            const fraction =
              total > 0 && p.fraction !== null && p.fraction !== undefined ? (i + p.fraction) / total : null;
            params.onProgress?.({
              receivedBytes: p.receivedBytes,
              totalBytes: p.totalBytes,
              fraction,
            });
          }
        : undefined;

      try {
        lastResult = await downloadOne({
          url: item.url,
          filename: item.filename,
          headers: item.headers,
          onProgress: wrappedOnProgress,
        }).promise;
      } catch {
        failures.push(item.filename);
        params.onProgress?.({ receivedBytes: 0, totalBytes: null, fraction: total > 0 ? (i + 1) / total : null });
      }

      if (controller.signal.aborted) {
        throw new AppError({ code: 'unknown' });
      }
    }

    if (!lastResult) {
      throw new AppError({ code: 'download_write_failed' });
    }

    if (failures.length > 0) {
      throw new AppError({ code: 'download_partial_failed', cause: `Failed items: ${failures.join(', ')}` });
    }

    return lastResult;
  })();

  return {
    promise,
    cancel: () => controller.abort(),
  };
}

export function createDownloaderService(): DownloaderService {
  return {
    downloadToDownloads: params => downloadOne(params),
    downloadManyToDownloads: params => downloadMany(params),
  };
}
