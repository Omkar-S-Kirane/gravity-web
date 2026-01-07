import type { HttpClient, HttpRequest, HttpResponse } from './types';

let activeClient: HttpClient | null = null;

export function setHttpClient(client: HttpClient): void {
  activeClient = client;
}

export function getHttpClient(): HttpClient {
  if (!activeClient) {
    throw new Error('httpClient is not configured. Call setHttpClient(...) in the platform bootstrap layer.');
  }
  return activeClient;
}

export async function httpClient(req: HttpRequest): Promise<HttpResponse> {
  return getHttpClient()(req);
}
