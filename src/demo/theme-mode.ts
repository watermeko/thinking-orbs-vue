export type ThemeMode = 'auto' | 'dark' | 'light';

/**
 * Apply a theme mode to the document root.
 *
 * `dark` / `light` pin `data-theme` (plus the Tailwind `dark`/`light`
 * class) on `<html>`, which is exactly what `theme="auto"` orbs look for on
 * an ancestor. `auto` removes both so the page — and every orb — falls back
 * to `prefers-color-scheme`, and live OS switches are visible.
 */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'auto') {
    root.removeAttribute('data-theme');
    root.classList.remove('dark', 'light');
    return;
  }
  root.setAttribute('data-theme', mode);
  root.classList.toggle('dark', mode === 'dark');
  root.classList.toggle('light', mode === 'light');
}

/** Initial mode: `?theme=dark|light|auto`, else `auto`. */
export function initialThemeMode(): ThemeMode {
  if (typeof location === 'undefined') return 'auto';
  const q = new URLSearchParams(location.search).get('theme');
  return q === 'dark' || q === 'light' || q === 'auto' ? q : 'auto';
}
