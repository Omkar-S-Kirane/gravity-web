import type { HttpClient, HttpRequest, HttpResponse } from '../types';

function sanitizeHeadersForDirectFetch(headers: Readonly<Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'cookie') continue;
    out[k] = v;
  }
  return out;
}

async function directFetch(req: HttpRequest): Promise<HttpResponse> {
  const res = await fetch(req.url.toString(), {
    method: req.method,
    headers: req.headers ? sanitizeHeadersForDirectFetch(req.headers) : undefined,
  });

  const text = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  return {
    ok: res.ok,
    status: res.status,
    url: res.url,
    text,
    headers,
  };
}

async function proxyFetch(req: HttpRequest): Promise<HttpResponse> {
  const proxyUrl = import.meta.env.VITE_HTTP_PROXY_ENDPOINT || '/api/proxy';

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      url: req.url.toString(),
      method: req.method,
      headers: req.headers ?? {},
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      url: req.url.toString(),
      text,
      headers: { 'content-type': res.headers.get('content-type') ?? '' },
    };
  }

  const parsed = JSON.parse(text) as {
    ok: boolean;
    status: number;
    url: string;
    text: string;
    headers?: Record<string, string>;
  };

  return {
    ok: parsed.ok,
    status: parsed.status,
    url: parsed.url,
    text: parsed.text,
    headers: parsed.headers ?? {},
  };
}

export function createWebHttpClient(): HttpClient {
  return async (req: HttpRequest) => {
    const host = req.url.hostname.toLowerCase();
    const isInstagramHost = host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'i.instagram.com';

    // Browser fetch to Instagram endpoints is commonly blocked by CORS and manifests as a fetch failure.
    // To keep resolver errors truthful (and avoid misclassifying CORS as "network"), we route all
    // Instagram host requests through the proxy.
    const useProxy = isInstagramHost || req.policy === 'story' || req.policy === 'session';
    return useProxy ? proxyFetch(req) : directFetch(req);
  };
}
