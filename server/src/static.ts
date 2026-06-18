/**
 * Minimal static-file handler so the backend can also serve the built web app
 * (web/dist) — enabling a single-service deploy (one port = game + API), which
 * avoids CORS and mixed-content behind a reverse proxy (e.g. a mikr.us VPS).
 *
 * Stdlib only; SPA fallback to index.html for client-side routing / PWA.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import type { ServerResponse } from 'node:http';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

export interface StaticHandler {
  enabled: boolean;
  root: string;
  /** Serve `pathname` from the static root. Returns true if it handled the response. */
  serve(pathname: string, res: ServerResponse): boolean;
}

export function makeStaticHandler(dir: string | undefined): StaticHandler {
  const root = dir ? resolve(dir) : '';
  const enabled = Boolean(root) && existsSync(join(root, 'index.html'));

  return {
    enabled,
    root,
    serve(pathname, res) {
      if (!enabled) return false;

      let rel = decodeURIComponent(pathname.split('?')[0]);
      if (rel.endsWith('/')) rel += 'index.html';

      let filePath = normalize(join(root, rel));
      // Prevent path traversal outside the static root.
      if (filePath !== root && !filePath.startsWith(root + sep)) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        res.end('forbidden');
        return true;
      }

      // SPA fallback: unknown paths / directories -> index.html.
      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        filePath = join(root, 'index.html');
      }

      const ext = extname(filePath).toLowerCase();
      const type = MIME[ext] ?? 'application/octet-stream';
      const isHtml = ext === '.html';
      res.writeHead(200, {
        'content-type': type,
        // Hashed assets are immutable; HTML must revalidate so updates land.
        'cache-control': isHtml ? 'no-cache' : 'public, max-age=86400',
        'access-control-allow-origin': '*',
      });
      createReadStream(filePath).pipe(res);
      return true;
    },
  };
}
