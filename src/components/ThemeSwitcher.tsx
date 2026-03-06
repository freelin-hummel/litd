import { Palette } from 'lucide-react';
import type { ThemeId } from '../themes';
import { THEMES, getNextTheme } from '../themes';

interface ThemeSwitcherProps {
  currentTheme: ThemeId;
  onSwitch: (next: ThemeId) => void;
}

export function ThemeSwitcher({ currentTheme, onSwitch }: ThemeSwitcherProps) {
  const currentMeta = THEMES.find((t) => t.id === currentTheme)!;
  const next = getNextTheme(currentTheme);
  const nextMeta = THEMES.find((t) => t.id === next)!;

  return (
    <div className="sidebar-footer">
      <button
        className="sidebar-theme-btn"
        onClick={() => onSwitch(next)}
        title={`Switch to ${nextMeta.label} theme`}
        aria-label={`Switch to ${nextMeta.label} theme`}
      >
        <Palette size={12} aria-hidden="true" />
        <span className="sidebar-theme-current">{currentMeta.shortLabel}</span>
        <span className="sidebar-theme-arrow">→</span>
        <span className="sidebar-theme-next">{nextMeta.shortLabel}</span>
      </button>
    </div>
  );
}
