import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

const THEME_KEY = 'iqm.theme';

export type Theme = 'light' | 'dark';

/**
 * Theme is a per-device preference, so it is read synchronously from
 * localStorage (not through the async StorageAdapter) to apply the correct
 * scheme before the first paint and avoid a light-theme flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<Theme>(this.initialTheme());

  constructor() {
    effect(() => {
      const theme = this.theme();
      this.document.documentElement.classList.toggle('dark-theme', theme === 'dark');
      localStorage.setItem(THEME_KEY, theme);
    });
  }

  toggle(): void {
    this.theme.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  private initialTheme(): Theme {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
}
