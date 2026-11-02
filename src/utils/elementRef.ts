import type { ComponentPublicInstance, Ref } from 'vue';

/** Keep a DOM ref when a shared surface component supplies its single root element. */
export function elementRef(target: Ref<HTMLElement | null>) {
  return (value: Element | ComponentPublicInstance | null) => {
    const element = value instanceof Element ? value : value?.$el;
    target.value = element instanceof HTMLElement ? element : null;
  };
}
