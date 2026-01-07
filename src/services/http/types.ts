export type HttpMethod = 'GET' | 'HEAD';

export type HttpPolicy = 'public' | 'story' | 'session';

export type HttpRequest = Readonly<{
  method: HttpMethod;
  url: URL;
  headers?: Readonly<Record<string, string>>;
  policy: HttpPolicy;
}>;

export type HttpResponse = Readonly<{
  ok: boolean;
  status: number;
  url: string;
  text: string;
  headers: Readonly<Record<string, string>>;
}>;

export type HttpClient = (req: HttpRequest) => Promise<HttpResponse>;
