import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin, ResolvedConfig, PreviewServer } from 'vite';
import { isKnownPage, normalizePath, pageMetadata, renderMetadata, SEO_PATHS, SITE_ORIGIN } from '../src/seo/metadata';
import { timelineResponse } from '../server/src/api/seo/timelineResponse';
import { renderSitemap, sitemapResponse } from '../server/src/api/seo/sitemap';

/** Static heads for existing routes; no rendering or modification of the application UI. */
export function seoPlugin(): Plugin {
  let config: ResolvedConfig;
  const allowIndexing = process.env.VERCEL_ENV !== 'preview';
  return {
    name: 'universal-timeline-seo',
    configResolved(value) { config = value; },
    transformIndexHtml: { order: 'post', handler: html => renderMetadata(html, pageMetadata(new URL('/', SITE_ORIGIN), null, allowIndexing)) },
    async closeBundle() {
      if (config.command !== 'build') return;
      const output = path.resolve(config.root, config.build.outDir);
      const template = await readFile(path.join(output, 'index.html'), 'utf8');
      for (const pathname of SEO_PATHS.filter(value => value !== '/')) {
        const file = path.join(output, '__seo__', `${pathname.slice(1)}.html`);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, renderMetadata(template, pageMetadata(new URL(pathname, SITE_ORIGIN), null, allowIndexing)));
      }
      await writeFile(path.join(output, '404.html'), renderMetadata(template, pageMetadata(new URL('/page-introuvable', SITE_ORIGIN))));
      await writeFile(path.join(output, 'sitemap.xml'), renderSitemap([], allowIndexing));
    },
    configurePreviewServer(server: PreviewServer) {
      // Mirror the deployed static routing and metadata proxy for local verification.
      server.middlewares.use(async (req, res, next) => {
        if (!['GET', 'HEAD'].includes(req.method ?? 'GET')) return next();
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${config.preview.port}`);
        if (url.pathname === '/sitemap.xml') {
          const response = await sitemapResponse(new Request(url, { method: req.method }), fetch, allowIndexing);
          res.statusCode = response.status; response.headers.forEach((value, key) => res.setHeader(key, value)); res.end(await response.text()); return;
        }
        if (/^\/(?:api(?:\/|$)|_vercel\/)/.test(url.pathname)) return next();
        try {
          const output = path.resolve(config.root, config.build.outDir);
          if (/\.[^/]+$/.test(url.pathname)) {
            const resource = path.resolve(output, `.${decodeURIComponent(url.pathname)}`);
            if (resource.startsWith(output + path.sep) && await stat(resource).then(value => value.isFile(), () => false)) return next();
            res.statusCode = 404; res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(req.method === 'HEAD' ? undefined : await readFile(path.join(output, '404.html'), 'utf8')); return;
          }
          if (normalizePath(url.pathname) === '/timeline') {
            const response = await timelineResponse(new Request(url, { method: req.method }), fetch, allowIndexing);
            if (response) { res.statusCode = response.status; response.headers.forEach((value, key) => res.setHeader(key, value)); res.end(await response.text()); return; }
          }
          const known = isKnownPage(url.pathname);
          const file = known ? normalizePath(url.pathname) === '/' ? 'index.html' : `__seo__${normalizePath(url.pathname)}.html` : '404.html';
          res.statusCode = known ? 200 : 404;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(req.method === 'HEAD' ? undefined : await readFile(path.join(output, file), 'utf8'));
        } catch (error) { next(error); }
      });
    },
  };
}
