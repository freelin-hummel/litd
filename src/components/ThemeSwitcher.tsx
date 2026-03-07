import { Palette } from 'lucide-react';
import type { ThemeId } from '../themes';
import { THEMES } from '../themes';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../primitives';

interface ThemeSwitcherProps {
  currentTheme: ThemeId;
  onSwitch: (next: ThemeId) => void;
}

export function ThemeSwitcher({ currentTheme, onSwitch }: ThemeSwitcherProps) {
  const currentMeta = THEMES.find((theme) => theme.id === currentTheme) ?? THEMES[0];

  return (
    <div className="sidebar-footer">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="sidebar-theme-btn"
            variant="outline"
            size="sm"
            title="Switch the shared application theme used by the app shell and canvas."
          >
            <Palette size={12} aria-hidden="true" />
            <span className="sidebar-theme-current">{currentMeta.shortLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup value={currentTheme} onValueChange={(value) => onSwitch(value as ThemeId)}>
            {THEMES.map((theme) => (
              <DropdownMenuRadioItem key={theme.id} value={theme.id}>
                {theme.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
