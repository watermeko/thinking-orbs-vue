// Theme resolution: explicit prop → ancestor data-theme/.dark|.light
// class (watched live) → prefers-color-scheme (subscribed live).
// SSR-safe: everything runs in lifecycle hooks; the pre-mount fallback is
// dark, and the canvas is client-only anyway.
//
// Ported from thinking-orbs' `src/theme.ts` (React hooks → Vue composables).

import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import type { OrbTheme } from './types';

function ancestorTheme(el: Element | null): boolean | null {
  let node: Element | null = el;
  while (node) {
    const attr = node.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    if (node.classList.contains('dark')) return true;
    if (node.classList.contains('light')) return false;
    node = node.parentElement;
  }
  return null;
}

function systemDark(): boolean {
  return typeof matchMedia === 'undefined' || matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Resolve the effective dark/light substrate for a mounted element.
 *
 * @param theme   getter for the current `theme` prop
 * @param hostRef ref to the element whose ancestors are inspected
 */
export function useResolvedDark(theme: () => OrbTheme, hostRef: Ref<Element | null>): Ref<boolean> {
  const dark = ref(true);

  const resolve = () => {
    const mode = theme();
    if (mode === 'dark') {
      dark.value = true;
      return;
    }
    if (mode === 'light') {
      dark.value = false;
      return;
    }
    const fromTree = ancestorTheme(hostRef.value);
    dark.value = fromTree ?? systemDark();
  };

  let mq: MediaQueryList | null = null;
  let mo: MutationObserver | null = null;

  onMounted(() => {
    resolve();

    // live OS/browser theme switches
    mq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;
    mq?.addEventListener('change', resolve);

    // live app-level toggles: watch class/data-theme flips on ancestors
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(resolve);
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class', 'data-theme'],
        subtree: true
      });
    }
  });

  // an explicit prop change (auto → dark → light) re-resolves at once
  watch(theme, resolve);

  onBeforeUnmount(() => {
    mq?.removeEventListener('change', resolve);
    mo?.disconnect();
    mo = null;
  });

  return dark;
}

/** Live `prefers-reduced-motion` — reduced users get a static frame. */
export function useReducedMotion(): Ref<boolean> {
  const reduced = ref(false);
  let mq: MediaQueryList | null = null;
  const on = (e: MediaQueryListEvent) => {
    reduced.value = e.matches;
  };

  onMounted(() => {
    if (typeof matchMedia === 'undefined') return;
    mq = matchMedia('(prefers-reduced-motion: reduce)');
    reduced.value = mq.matches;
    mq.addEventListener('change', on);
  });

  onBeforeUnmount(() => {
    mq?.removeEventListener('change', on);
    mq = null;
  });

  return reduced;
}
