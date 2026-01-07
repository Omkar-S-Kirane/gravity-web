import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function instagramProxyPlugin(): Plugin {
  return {
    name: 'instagram-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res) => {
        try {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'method_not_allowed' }));
            return;
          }

          const chunks: Buffer[] = [];
          for await (const c of req) {
            chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c)));
          }

          const raw = Buffer.concat(chunks).toString('utf8');
          const body = JSON.parse(raw || '{}') as {
            url?: string;
            method?: 'GET' | 'HEAD';
            headers?: Record<string, string>;
          };

          const method = body.method ?? 'GET';
          if (method !== 'GET' && method !== 'HEAD') {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'invalid_method' }));
            return;
          }

          if (typeof body.url !== 'string' || body.url.trim().length === 0) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'missing_url' }));
            return;
          }

          let target: URL;
          try {
            target = new URL(body.url);
          } catch {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'invalid_url' }));
            return;
          }

          const host = target.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
          const allowedHosts = new Set(['instagram.com', 'i.instagram.com']);
          if (!allowedHosts.has(host)) {
            res.statusCode = 403;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: 'host_not_allowed' }));
            return;
          }

          const incomingHeaders = body.headers ?? {};
          const forwarded: Record<string, string> = {};
          const allow = new Set([
            'accept',
            'accept-language',
            'user-agent',
            'x-ig-app-id',
            'x-ig-www-claim',
            'x-requested-with',
            'cookie',
            'range',
          ]);

          for (const [k, v] of Object.entries(incomingHeaders)) {
            if (!allow.has(k.toLowerCase())) continue;
            forwarded[k] = v;
          }

          const upstream = await fetch(target.toString(), {
            method,
            headers: forwarded,
            redirect: 'follow',
          });

          const text = await upstream.text();
          res.statusCode = 200;
          res.setHeader('content-type', 'application/json');
          res.end(
            JSON.stringify({
              ok: upstream.ok,
              status: upstream.status,
              url: upstream.url,
              text,
              headers: {
                'content-type': upstream.headers.get('content-type') ?? '',
              },
            }),
          );
        } catch (e: unknown) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: 'proxy_failed', message: e instanceof Error ? e.message : String(e) }));
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), instagramProxyPlugin()],
})
