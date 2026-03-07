/**
 * Maps CategoryId values to lucide-react icon components.
 * Update this file to change category icons without touching component logic.
 */
import {
  AlignLeft,
  BookOpen,
  ChevronRight,
  FileText,
  Folder,
  Globe,
  Map,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Skull,
  Trash2,
  User,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Icons for the built-in categories. */
const BUILTIN_CATEGORY_ICONS: Partial<Record<string, LucideIcon>> = {
  worlds:     Globe,
  locations:  MapPin,
  factions:   Shield,
  characters: User,
  lore:       BookOpen,
  bestiary:   Skull,
};

/**
 * Returns the icon for a category ID.
 * Built-in categories get their dedicated icon; custom categories fall back to Folder.
 */
export function getCategoryIcon(categoryId: string): LucideIcon {
  return BUILTIN_CATEGORY_ICONS[categoryId] ?? Folder;
}

/** Document-editor mode icon (structured document / text) */
export const DocumentModeIcon = AlignLeft;

/** Edgeless-editor mode icon (canvas / map) */
export const CanvasModeIcon = Map;

export { ChevronRight, FileText, Folder, Pencil, Plus, Trash2, Zap };
