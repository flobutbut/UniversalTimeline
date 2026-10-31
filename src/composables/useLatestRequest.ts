import { getCurrentScope, onScopeDispose } from 'vue';

/** A view can share a read while ignoring its result after navigation or disposal. */
export function useLatestRequest() {
  let version = 0;
  let active = true;
  const cancel = () => { version++; };
  if (getCurrentScope()) onScopeDispose(() => { active = false; cancel(); });
  const begin = () => {
    const requestVersion = ++version;
    return () => active && requestVersion === version;
  };
  return { begin, cancel };
}
