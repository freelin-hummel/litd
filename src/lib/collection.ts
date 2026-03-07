import type { DocumentPage, EditorMode } from './document-pages';

/** Category IDs are arbitrary strings; built-in categories use well-known values. */
export type CategoryId = string;

export interface Category {
  id: string;
  label: string;
  /** Singular label used in "New <X>" button text */
  newLabel: string;
  pageIds: string[];
}

/** App-level metadata store; editor implementations own page content separately. */
export interface WorldStore {
  categories: Category[];
  pages: Record<string, DocumentPage>;
}

const DEFAULT_DOC_MODE: EditorMode = 'document';

const INITIAL_DOCS: Record<string, { title: string; mode?: EditorMode }[]> = {
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
  bestiary: [{ title: 'Ultra — Horus Goblin', mode: 'canvas' }],
};

/** localStorage keys for persisting metadata. */
const CATEGORIES_STORAGE_KEY = 'litd:categories';
const PAGES_STORAGE_KEY = 'litd:pages';
const LEGACY_DOCS_STORAGE_KEY = 'litd:docs';

type StoredPages = Record<string, DocumentPage>;

function generateDocId(): string {
  return `doc-${crypto.randomUUID()}`;
}

/** Persist the category list (pageIds only) to localStorage. */
export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }
}

function savePages(pages: StoredPages): void {
  try {
    localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(pages));
    localStorage.removeItem(LEGACY_DOCS_STORAGE_KEY);
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }
}

function normalizeCategories(value: unknown): Category[] | null {
  if (!Array.isArray(value)) return null;
  const categories: Category[] = [];

  for (const item of value) {
    if (item === null || typeof item !== 'object') return null;
    const record = item as Record<string, unknown>;
    const legacyDocIds = Array.isArray(record.docIds) ? record.docIds : null;
    // If both fields exist, prefer the new pageIds shape and treat docIds as a
    // legacy fallback only.
    const pageIds = Array.isArray(record.pageIds) ? record.pageIds : legacyDocIds;

    if (
      typeof record.id !== 'string' ||
      record.id === '' ||
      typeof record.label !== 'string' ||
      typeof record.newLabel !== 'string' ||
      pageIds === null ||
      !pageIds.every((id) => typeof id === 'string')
    ) {
      return null;
    }

    categories.push({
      id: record.id,
      label: record.label,
      newLabel: record.newLabel,
      pageIds,
    });
  }

  return categories;
}

function isEditorMode(value: unknown): value is EditorMode {
  return value === 'document' || value === 'canvas';
}

function isValidPages(value: unknown): value is StoredPages {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.entries(value).every(([id, page]) => {
    if (page === null || typeof page !== 'object') return false;
    const record = page as Record<string, unknown>;
    return (
      typeof id === 'string' &&
      typeof record.id === 'string' &&
      record.id === id &&
      typeof record.title === 'string' &&
      isEditorMode(record.mode)
    );
  });
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
let categoryIdSequence = 0;
function generateCategoryId(): string {
  return `cat-${Date.now().toString(36)}-${(++categoryIdSequence).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Load the category list from localStorage, or return null if not found. */
function loadCategories(): Category[] | null {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return normalizeCategories(parsed);
  } catch {
    return null;
  }
}

function loadPages(): StoredPages | null {
  try {
    const raw =
      localStorage.getItem(PAGES_STORAGE_KEY) ?? localStorage.getItem(LEGACY_DOCS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidPages(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function createSeedStore(): WorldStore {
  const categories: Category[] = [
    { id: 'worlds', label: 'Worlds', newLabel: 'World', pageIds: [] },
    { id: 'locations', label: 'Locations', newLabel: 'Location', pageIds: [] },
    { id: 'factions', label: 'Factions', newLabel: 'Faction', pageIds: [] },
    { id: 'characters', label: 'Characters', newLabel: 'Character', pageIds: [] },
    { id: 'lore', label: 'Lore & History', newLabel: 'Lore Entry', pageIds: [] },
    { id: 'bestiary', label: 'Bestiary', newLabel: 'Entry', pageIds: [] },
  ];

  const pages: StoredPages = {};

  for (const category of categories) {
    const defs = INITIAL_DOCS[category.id] ?? [];
    for (const def of defs) {
      const id = generateDocId();
      pages[id] = {
        id,
        title: def.title,
        mode: def.mode ?? DEFAULT_DOC_MODE,
      };
      category.pageIds.push(id);
    }
  }

  return { categories, pages };
}

function reconcileStore(categories: Category[], pages: StoredPages): WorldStore {
  const reconciledCategories = categories.map((category) => ({
    ...category,
    pageIds: category.pageIds.filter((pageId) => {
      if (pages[pageId]) return true;
      console.warn(`Recovered missing document metadata for "${pageId}" from saved categories.`);
      pages[pageId] = {
        id: pageId,
        title: 'Untitled',
        mode: DEFAULT_DOC_MODE,
      };
      return true;
    }),
  }));

  return { categories: reconciledCategories, pages };
}

export function initWorldStore(): WorldStore {
  const storedCategories = loadCategories();
  const storedPages = loadPages();

  if (storedCategories) {
    const store = reconcileStore(storedCategories, storedPages ?? {});
    saveCategories(store.categories);
    savePages(store.pages);
    return store;
  }

  const seeded = createSeedStore();
  saveCategories(seeded.categories);
  savePages(seeded.pages);
  return seeded;
}

export function addPageToCategory(
  store: WorldStore,
  categoryId: string,
  title: string,
): string {
  const id = generateDocId();
  store.pages[id] = {
    id,
    title,
    mode: DEFAULT_DOC_MODE,
  };

  const category = store.categories.find((c) => c.id === categoryId);
  if (category) {
    category.pageIds.push(id);
  }

  savePages(store.pages);
  saveCategories(store.categories);
  return id;
}

export function getPageTitle(store: WorldStore, pageId: string): string {
  return store.pages[pageId]?.title ?? 'Untitled';
}

export function getPage(store: WorldStore, pageId: string): DocumentPage | null {
  return store.pages[pageId] ?? null;
}

export function setPageMode(store: WorldStore, pageId: string, mode: EditorMode): void {
  const page = store.pages[pageId];
  if (!page || page.mode === mode) return;
  page.mode = mode;
  savePages(store.pages);
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
  const category: Category = { id, label: trimmed, newLabel, pageIds: [] };
  store.categories.push(category);
  saveCategories(store.categories);
  return category;
}

/**
 * Remove a category from the store.
 * Returns the page IDs that were in the deleted category so the caller can
 * clear any active selection if needed.
 */
export function removeCategory(store: WorldStore, categoryId: string): string[] {
  const idx = store.categories.findIndex((c) => c.id === categoryId);
  if (idx === -1) return [];
  const [removed] = store.categories.splice(idx, 1);
  saveCategories(store.categories);
  return removed.pageIds;
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
