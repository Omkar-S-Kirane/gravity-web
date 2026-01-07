export type AppErrorCode =
  | 'clipboard_unavailable'
  | 'clipboard_empty'
  | 'invalid_url'
  | 'downloader_unavailable'
  | 'download_http_error'
  | 'download_write_failed'
  | 'download_partial_failed'
  | 'download_not_resolved'
  | 'unknown';

type AppErrorParams = Readonly<{
  code: AppErrorCode;
  cause?: unknown;
}>;

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly cause?: unknown;

  public constructor({ code, cause }: AppErrorParams) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  return new AppError({ code: 'unknown', cause: err });
}
