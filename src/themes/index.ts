/** Available theme identifiers. Add new entries here to register a theme. */
export type ThemeId = 'dark-fantasy' | 'lancer';

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  /** Short label shown in the theme-switcher button */
  shortLabel: string;
}

/** All registered themes. Order determines the cycle/switcher order. */
export const THEMES: ThemeMeta[] = [
  { id: 'dark-fantasy', label: 'Dark Fantasy', shortLabel: 'Fantasy' },
  { id: 'lancer',       label: 'LANCER',       shortLabel: 'LANCER'  },
];

export const DEFAULT_THEME: ThemeId = 'lancer';

export function applyTheme(id: ThemeId): void {
  document.documentElement.setAttribute('data-theme', id);
}

export function getNextTheme(current: ThemeId): ThemeId {
  const idx = THEMES.findIndex((t) => t.id === current);
  return THEMES[(idx + 1) % THEMES.length].id;
}
