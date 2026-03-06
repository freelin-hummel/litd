/**
 * Maps CategoryId values to lucide-react icon components.
 * Update this file to change category icons without touching component logic.
 */
import {
  BookOpen,
  ChevronRight,
  FileText,
  Globe,
  MapPin,
  Plus,
  Shield,
  Skull,
  User,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CategoryId } from '../lib/collection';

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  worlds:     Globe,
  locations:  MapPin,
  factions:   Shield,
  characters: User,
  lore:       BookOpen,
  bestiary:   Skull,
};

export { ChevronRight, FileText, Plus, Zap };
