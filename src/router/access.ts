import type { Router } from 'vue-router';
import type { useAuthStore } from '@/stores/useAuthStore';

export function canUseWorkspace(auth: ReturnType<typeof useAuthStore>): boolean {
  return auth.enabled === true && auth.ready && auth.signedIn;
}

export function installAccessGuard(router: Router, auth: ReturnType<typeof useAuthStore>) {
  return router.beforeEach(async to => {
    const wasReady = auth.ready;
    await auth.initialize();
    if (auth.enabled === true && wasReady && to.meta.public !== true) await auth.refreshAccount();
    // An unavailable configuration never opens a protected page.
    if (to.meta.public === true) return true;
    if (!canUseWorkspace(auth)) return { name: 'login', query: { redirect: to.fullPath } };
    if (to.meta.admin && !auth.isAdmin) return { name: 'forbidden' };
    return true;
  });
}

/** Only local paths, with no protocol-relative/backslash escape. */
export function safeReturnPath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[\\\u0000-\u001f]/.test(value) && !/^\/(?:login|forbidden)(?:[/?#]|$)/.test(value)
    ? value : '/timeline';
}
