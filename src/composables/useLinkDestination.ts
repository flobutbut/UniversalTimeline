import { computed, inject, toValue, type MaybeRefOrGetter } from 'vue';
import { routerKey, type RouteLocationRaw } from 'vue-router';

/** Shared links also render as ordinary anchors outside a router (isolated UI/tests). */
export function useLinkDestination(destination: MaybeRefOrGetter<RouteLocationRaw | undefined>) {
  const router = inject(routerKey, null);
  const plainHref = computed(() => {
    const to = toValue(destination);
    if (typeof to === 'string') return to;
    if (!to || !('path' in to) || !to.path) return undefined;
    const query = new URLSearchParams(Object.entries(to.query ?? {}).flatMap(([key, value]) => value == null ? [] : [[key, String(value)]])).toString();
    return `${to.path}${query ? `?${query}` : ''}${to.hash ?? ''}`;
  });
  return { router, plainHref };
}
