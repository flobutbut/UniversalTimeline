import { getCurrentScope, onScopeDispose } from 'vue';

/** A view can share a read while ignoring its result after navigation or disposal. */
export function useLatestRequest() {
  let version = 0;
  let active = true;
  let controller = new AbortController();
  const cancel = () => { version++; controller.abort(); controller = new AbortController(); };
  if (getCurrentScope()) onScopeDispose(() => { active = false; cancel(); });
  const begin = () => {
    cancel();
    const requestVersion = ++version;
    return () => active && requestVersion === version;
  };
  return { begin, cancel, get signal() { return controller.signal; } };
}
