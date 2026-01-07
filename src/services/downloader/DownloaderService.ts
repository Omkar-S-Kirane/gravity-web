export type DownloadProgress = Readonly<{
  receivedBytes: number;
  totalBytes: number | null;
  fraction: number | null;
}>;

export type DownloadResult = Readonly<{
  filename: string;
}>;

export type DownloadTask = Readonly<{
  promise: Promise<DownloadResult>;
  cancel: () => void;
}>;

export type DownloadItem = Readonly<{
  url: URL;
  filename: string;
  headers?: Readonly<Record<string, string>>;
}>;

type DownloadParams = Readonly<{
  url: URL;
  filename: string;
  headers?: Readonly<Record<string, string>>;
  onProgress?: (progress: DownloadProgress) => void;
}>;

type DownloadManyParams = Readonly<{
  items: readonly DownloadItem[];
  onProgress?: (progress: DownloadProgress) => void;
}>;

export type DownloaderService = Readonly<{
  downloadToDownloads: (params: DownloadParams) => DownloadTask;
  downloadManyToDownloads?: (params: DownloadManyParams) => DownloadTask;
}>;
