import { AffineSchemas } from '@blocksuite/blocks/schemas';
import { createDefaultDoc } from '@blocksuite/affine-shared/utils';
import {
  BroadcastChannelAwarenessSource,
  BroadcastChannelDocSource,
  IndexedDBDocSource,
} from '@blocksuite/sync';
import { DocCollection, Schema } from '@blocksuite/store';

/** Category IDs are arbitrary strings; built-in categories use well-known values. */
export type CategoryId = string;

export interface Category {
  id: string;
  label: string;
  /** Singular label used in "New <X>" button text */
  newLabel: string;
  docIds: string[];
}

export interface WorldStore {
  collection: DocCollection;
  categories: Category[];
}

const INITIAL_DOCS: Record<string, { title: string }[]> = {
  worlds: [{ title: 'Karrakis Trade Baronies — Campaign Overview' }],
  locations: [
    { title: 'Cradle' },
    { title: 'Cornucopia Station' },
  ],
  factions: [
    { title: 'Harrison Armory' },
    { title: 'IPS-Northstar' },
  ],
  characters: [
    { title: 'Navarro (PC — Call Sign: PILGRIM)' },
    { title: 'Director Chen (NPC)' },
  ],
  lore: [{ title: 'The Deimos Event' }],
  bestiary: [{ title: 'Ultra — Horus Goblin' }],
};

/** localStorage key for persisting category/docId mappings. */
const CATEGORIES_STORAGE_KEY = 'litd:categories';

/** Persist the category list (docIds only) to localStorage. */
export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }
}

/** Validate a parsed value is a well-formed Category[]. */
function isValidCategories(value: unknown): value is Category[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      (item as Record<string, unknown>).id !== '' &&
      typeof (item as Record<string, unknown>).label === 'string' &&
      typeof (item as Record<string, unknown>).newLabel === 'string' &&
      Array.isArray((item as Record<string, unknown>).docIds) &&
      ((item as Record<string, unknown>).docIds as unknown[]).every(
        (id) => typeof id === 'string',
      ),
  );
}

/** Derive a reasonable singular form of a category label for the "New <X>" button. */
function deriveSingular(label: string): string {
  const t = label.trim();
  if (t.toLowerCase().endsWith('ies') && t.length > 3) return t.slice(0, -3) + 'y';
  if (t.toLowerCase().endsWith('es') && t.length > 3) return t.slice(0, -2);
  if (t.toLowerCase().endsWith('s') && t.length > 2) return t.slice(0, -1);
  return t;
}

/** Generate a unique ID for a user-created category. */
let _catCounter = 0;
function generateCategoryId(): string {
  return `cat-${Date.now().toString(36)}-${(++_catCounter).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Load the category list from localStorage, or return null if not found. */
function loadCategories(): Category[] | null {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidCategories(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function initWorldStore(): WorldStore {
  const schema = new Schema().register(AffineSchemas);

  // IndexedDB is the primary (persistent) doc source; it also notifies other
  // tabs via an internal BroadcastChannel so doc updates are visible
  // immediately across tabs without a full reload.
  // BroadcastChannelDocSource acts as a shadow source for in-memory cross-tab
  // sync during the current session, and
  // BroadcastChannelAwarenessSource propagates cursor/selection state.
  const collection = new DocCollection({
    schema,
    docSources: {
      main: new IndexedDBDocSource('litd'),
      shadows: [new BroadcastChannelDocSource()],
    },
    awarenessSources: [new BroadcastChannelAwarenessSource('litd:awareness')],
  });
  collection.meta.initialize();

  const stored = loadCategories();

  if (stored) {
    // Restore the sidebar structure from localStorage; the doc content will
    // be loaded lazily from IndexedDB by the DocEngine.
    return { collection, categories: stored };
  }

  // First visit: seed the collection with sample documents.
  const categories: Category[] = [
    { id: 'worlds',     label: 'Worlds',        newLabel: 'World',      docIds: [] },
    { id: 'locations',  label: 'Locations',     newLabel: 'Location',   docIds: [] },
    { id: 'factions',   label: 'Factions',      newLabel: 'Faction',    docIds: [] },
    { id: 'characters', label: 'Characters',    newLabel: 'Character',  docIds: [] },
    { id: 'lore',       label: 'Lore & History',newLabel: 'Lore Entry', docIds: [] },
    { id: 'bestiary',   label: 'Bestiary',      newLabel: 'Entry',      docIds: [] },
  ];

  for (const category of categories) {
    const defs = INITIAL_DOCS[category.id] ?? [];
    for (const def of defs) {
      const doc = createDefaultDoc(collection, { title: def.title });
      category.docIds.push(doc.id);
    }
  }

  saveCategories(categories);
  return { collection, categories };
}

export function addDocToCategory(
  store: WorldStore,
  categoryId: string,
  title: string,
): string {
  const doc = createDefaultDoc(store.collection, { title });
  const category = store.categories.find((c) => c.id === categoryId);
  if (category) {
    category.docIds.push(doc.id);
  }
  saveCategories(store.categories);
  return doc.id;
}

export function getDocTitle(collection: DocCollection, docId: string): string {
  const meta = collection.meta.getDocMeta(docId);
  return meta?.title ?? 'Untitled';
}

/**
 * Add a new user-defined category. Throws if the name is empty or already
 * taken by an existing category (case-insensitive).
 */
export function addCategory(store: WorldStore, label: string): Category {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Category name cannot be empty.');
  if (
    store.categories.some(
      (c) => c.label.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    throw new Error(`A category named "${trimmed}" already exists.`);
  }
  const id = generateCategoryId();
  const newLabel = deriveSingular(trimmed);
  const category: Category = { id, label: trimmed, newLabel, docIds: [] };
  store.categories.push(category);
  saveCategories(store.categories);
  return category;
}

/**
 * Remove a category from the store.
 * Returns the doc IDs that were in the deleted category so the caller can
 * clear any active selection if needed.
 */
export function removeCategory(store: WorldStore, categoryId: string): string[] {
  const idx = store.categories.findIndex((c) => c.id === categoryId);
  if (idx === -1) return [];
  const [removed] = store.categories.splice(idx, 1);
  saveCategories(store.categories);
  return removed.docIds;
}

/**
 * Rename an existing category. Throws if the new name is empty or already
 * taken by another category (case-insensitive).
 */
export function renameCategory(
  store: WorldStore,
  categoryId: string,
  newLabel: string,
): void {
  const trimmed = newLabel.trim();
  if (!trimmed) throw new Error('Category name cannot be empty.');
  const category = store.categories.find((c) => c.id === categoryId);
  if (!category) return;
  if (
    store.categories.some(
      (c) => c.id !== categoryId && c.label.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    throw new Error(`A category named "${trimmed}" already exists.`);
  }
  category.label = trimmed;
  category.newLabel = deriveSingular(trimmed);
  saveCategories(store.categories);
}
