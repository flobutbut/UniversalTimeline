export * from '../../server/src/shared/seoMetadata';
import type { PageMetadata } from '../../server/src/shared/seoMetadata';

export function applyMetadata(metadata: PageMetadata, target: Document = document): void {
  target.title = metadata.title;
  for (const [name, content] of [['description', metadata.description], ['robots', metadata.robots]]) {
    let element = target.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!element) { element = target.createElement('meta'); element.name = name; target.head.append(element); }
    element.content = content;
  }
  let canonical = target.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!metadata.canonical) canonical?.remove();
  else {
    if (!canonical) { canonical = target.createElement('link'); canonical.rel = 'canonical'; target.head.append(canonical); }
    canonical.href = metadata.canonical;
  }
}
