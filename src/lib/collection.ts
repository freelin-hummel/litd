import { AffineSchemas } from '@blocksuite/blocks/schemas';
import { createDefaultDoc } from '@blocksuite/affine-shared/utils';
import {
  BroadcastChannelAwarenessSource,
  BroadcastChannelDocSource,
  IndexedDBDocSource,
} from '@blocksuite/sync';
import { DocCollection, Schema } from '@blocksuite/store';

export type CategoryId =
  | 'worlds'
  | 'locations'
  | 'factions'
  | 'characters'
  | 'lore'
  | 'bestiary';

export interface Category {
  id: CategoryId;
  label: string;
  /** Singular label used in "New <X>" button text */
  newLabel: string;
  docIds: string[];
}

export interface WorldStore {
  collection: DocCollection;
  categories: Category[];
}

const INITIAL_DOCS: Record<CategoryId, { title: string }[]> = {
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
  const validIds = new Set<string>([
    'worlds', 'locations', 'factions', 'characters', 'lore', 'bestiary',
  ]);
  return value.every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).id === 'string' &&
      validIds.has((item as Record<string, unknown>).id as string) &&
      typeof (item as Record<string, unknown>).label === 'string' &&
      typeof (item as Record<string, unknown>).newLabel === 'string' &&
      Array.isArray((item as Record<string, unknown>).docIds) &&
      ((item as Record<string, unknown>).docIds as unknown[]).every(
        (id) => typeof id === 'string',
      ),
  );
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
  categoryId: CategoryId,
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
