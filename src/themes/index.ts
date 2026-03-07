/** Available theme identifiers. Add new entries here to register a theme. */
export type ThemeId = 'dark-fantasy' | 'lancer';
export type ThemeAppearance = 'dark' | 'light';

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  /** Short label shown in compact controls. */
  shortLabel: string;
  /** UI appearance passed through to browser and editor integrations. */
  appearance: ThemeAppearance;
}

/** All registered themes. Order determines the switcher order. */
export const THEMES: ThemeMeta[] = [
  { id: 'dark-fantasy', label: 'Dark Fantasy', shortLabel: 'Fantasy', appearance: 'dark' },
  { id: 'lancer', label: 'LANCER', shortLabel: 'LANCER', appearance: 'dark' },
];

export const DEFAULT_THEME: ThemeId = 'lancer';

export function getThemeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

export function applyTheme(id: ThemeId): void {
  const meta = getThemeMeta(id);
  document.documentElement.setAttribute('data-theme', id);
  document.documentElement.setAttribute('data-color-scheme', meta.appearance);
  document.documentElement.style.colorScheme = meta.appearance;
}

export function getNextTheme(current: ThemeId): ThemeId {
  const idx = THEMES.findIndex((theme) => theme.id === current);
  return THEMES[(idx + 1) % THEMES.length].id;
}
