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

export const CATEGORY_ICON_NAMES = [
  'book-open',
  'folder',
  'globe',
  'map-pin',
  'shield',
  'skull',
  'user',
] as const;

export type CategoryIconName = (typeof CATEGORY_ICON_NAMES)[number];

export const DEFAULT_CATEGORY_ICON_NAME: CategoryIconName = 'folder';

const CATEGORY_ICONS: Record<CategoryIconName, LucideIcon> = {
  'book-open': BookOpen,
  folder: Folder,
  globe: Globe,
  'map-pin': MapPin,
  shield: Shield,
  skull: Skull,
  user: User,
};

export function isCategoryIconName(value: unknown): value is CategoryIconName {
  return typeof value === 'string' && CATEGORY_ICON_NAMES.includes(value as CategoryIconName);
}

/**
 * Returns the icon selected in persisted category metadata.
 */
export function getCategoryIcon(iconName: string | null | undefined): LucideIcon {
  return isCategoryIconName(iconName) ? CATEGORY_ICONS[iconName] : Folder;
}

/** Document-editor mode icon (structured document / text) */
export const DocumentModeIcon = AlignLeft;

/** Edgeless-editor mode icon (canvas / map) */
export const CanvasModeIcon = Map;

export { ChevronRight, FileText, Folder, Pencil, Plus, Trash2, Zap };
