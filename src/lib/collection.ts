import type { CollaborationSession, DocumentPage } from './document';
import {
  createCollaborationSession,
  createDocumentPage,
  destroyCollaborationSession,
  normalizeDocumentPage,
} from './document';
import type { EditorMode } from './document-pages';
import {
  DEFAULT_CATEGORY_ICON_NAME,
  isCategoryIconName,
  type CategoryIconName,
} from './icons';

/** Category IDs are arbitrary strings; built-in categories use well-known values. */
export type CategoryId = string;

export type { EditorMode } from './document-pages';

export interface CategoryMetadata {
  icon: CategoryIconName;
}

export interface Category {
  id: string;
  label: string;
  /** Singular label used in "New <X>" button text */
  newLabel: string;
  docIds: string[];
  metadata: CategoryMetadata;
}

export interface WorldDoc {
  id: string;
  title: string;
  mode: EditorMode;
  page: DocumentPage;
}

export interface WorldStore {
  categories: Category[];
  docs: Record<string, WorldDoc>;
}

const DEFAULT_DOC_MODE: EditorMode = 'document';

interface SeedCategoryDefinition {
  id: CategoryId;
  label: string;
  newLabel: string;
  metadata: CategoryMetadata;
  docs: { title: string; mode?: EditorMode }[];
}

const DEFAULT_CATEGORY_SEEDS: SeedCategoryDefinition[] = [
  {
    id: 'worlds',
    label: 'Worlds',
    newLabel: 'World',
    metadata: { icon: 'globe' },
    docs: [{ title: 'Karrakis Trade Baronies — Campaign Overview' }],
  },
  {
    id: 'locations',
    label: 'Locations',
    newLabel: 'Location',
    metadata: { icon: 'map-pin' },
    docs: [
      { title: 'Cradle' },
      { title: 'Cornucopia Station' },
    ],
  },
  {
    id: 'factions',
    label: 'Factions',
    newLabel: 'Faction',
    metadata: { icon: 'shield' },
    docs: [
      { title: 'Harrison Armory' },
      { title: 'IPS-Northstar' },
    ],
  },
  {
    id: 'characters',
    label: 'Characters',
    newLabel: 'Character',
    metadata: { icon: 'user' },
    docs: [
      { title: 'Navarro (PC — Call Sign: PILGRIM)' },
      { title: 'Director Chen (NPC)' },
    ],
  },
  {
    id: 'lore',
    label: 'Lore & History',
    newLabel: 'Lore Entry',
    metadata: { icon: 'book-open' },
    docs: [{ title: 'The Deimos Event' }],
  },
  {
    id: 'bestiary',
    label: 'Bestiary',
    newLabel: 'Entry',
    metadata: { icon: 'skull' },
    docs: [{ title: 'Ultra — Horus Goblin', mode: 'canvas' }],
  },
];

const DEFAULT_CATEGORY_SEEDS_BY_ID = new Map(
  DEFAULT_CATEGORY_SEEDS.map((seed) => [seed.id, seed]),
);

/** localStorage keys for persisting metadata. */
const CATEGORIES_STORAGE_KEY = 'litd:categories';
const DOCS_STORAGE_KEY = 'litd:docs';

type StoredDocs = Record<string, WorldDoc>;

const collaborationSessionCache = new Map<string, CollaborationSession>();

function generateDocId(): string {
  return `doc-${crypto.randomUUID()}`;
}

/** Persist the category list, including presentation metadata, to localStorage. */
export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }
}

function saveDocs(docs: StoredDocs): void {
  try {
    localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(docs));
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
      ((item as Record<string, unknown>).metadata === undefined ||
        ((item as Record<string, unknown>).metadata !== null &&
          typeof (item as Record<string, unknown>).metadata === 'object')) &&
      ((item as Record<string, unknown>).docIds as unknown[]).every(
        (id) => typeof id === 'string',
      ),
  );
}

function isEditorMode(value: unknown): value is EditorMode {
  return value === 'document' || value === 'canvas';
}

function isValidDocumentPage(value: unknown): boolean {
  if (value === undefined) return true;
  if (value === null || typeof value !== 'object') return false;

  const page = value as Record<string, unknown>;
  return (
    (typeof page.markdown === 'string' || page.markdown === undefined) &&
    (typeof page.updatedAt === 'string' || page.updatedAt === null || page.updatedAt === undefined) &&
    (page.model === undefined || (page.model !== null && typeof page.model === 'object'))
  );
}

function isValidDocs(value: unknown): value is StoredDocs {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.entries(value).every(([id, doc]) => {
    if (doc === null || typeof doc !== 'object') return false;
    const record = doc as Record<string, unknown>;
    return (
      typeof id === 'string' &&
      typeof record.id === 'string' &&
      record.id === id &&
      typeof record.title === 'string' &&
      isEditorMode(record.mode) &&
      isValidDocumentPage(record.page)
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

function normalizeCategoryMetadata(
  value: unknown,
  fallback: CategoryMetadata = { icon: DEFAULT_CATEGORY_ICON_NAME },
): CategoryMetadata {
  if (value === null || typeof value !== 'object') {
    return { ...fallback };
  }

  const record = value as Record<string, unknown>;
  return {
    icon: isCategoryIconName(record.icon) ? record.icon : fallback.icon,
  };
}

function normalizeCategory(value: Category): Category {
  const seed = DEFAULT_CATEGORY_SEEDS_BY_ID.get(value.id);
  const record = value as unknown as Record<string, unknown>;

  return {
    id: value.id,
    label: value.label,
    newLabel: value.newLabel,
    docIds: value.docIds.filter((docId) => typeof docId === 'string'),
    metadata: normalizeCategoryMetadata(record.metadata, seed?.metadata),
  };
}

/** Load the category list from localStorage, or return null if not found. */
function loadCategories(): Category[] | null {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidCategories(parsed) ? parsed.map((category) => normalizeCategory(category)) : null;
  } catch {
    return null;
  }
}

function loadDocs(): StoredDocs | null {
  try {
    const raw = localStorage.getItem(DOCS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidDocs(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getDocMembership(
  store: WorldStore,
  docId: string,
): { categoryIds: string[]; sortIndex: number | null } {
  const categoryIds: string[] = [];
  let sortIndex: number | null = null;

  for (const category of store.categories) {
    const index = category.docIds.indexOf(docId);
    if (index === -1) continue;
    categoryIds.push(category.id);
    if (sortIndex === null) {
      sortIndex = index;
    }
  }

  return { categoryIds, sortIndex };
}

function syncStoredDocPage(store: WorldStore, docId: string): void {
  const doc = store.docs[docId];
  if (!doc) return;

  const membership = getDocMembership(store, docId);
  doc.page = normalizeDocumentPage(doc.page, {
    id: doc.id,
    title: doc.title,
    mode: doc.mode,
    categoryIds: membership.categoryIds,
    sortIndex: membership.sortIndex,
  });
}

function createSeedStore(): WorldStore {
  const categories: Category[] = DEFAULT_CATEGORY_SEEDS.map((seed) => ({
    id: seed.id,
    label: seed.label,
    newLabel: seed.newLabel,
    docIds: [],
    metadata: { ...seed.metadata },
  }));

  const docs: StoredDocs = {};

  for (const category of categories) {
    const defs = DEFAULT_CATEGORY_SEEDS_BY_ID.get(category.id)?.docs ?? [];
    for (const def of defs) {
      const id = generateDocId();
      docs[id] = {
        id,
        title: def.title,
        mode: def.mode ?? DEFAULT_DOC_MODE,
        page: createDocumentPage({
          id,
          title: def.title,
          mode: def.mode ?? DEFAULT_DOC_MODE,
          categoryIds: [category.id],
          sortIndex: category.docIds.length,
        }),
      };
      category.docIds.push(id);
    }
  }

  return { categories, docs };
}

function reconcileStore(categories: Category[], docs: StoredDocs): WorldStore {
  const membership = new Map<string, { categoryIds: string[]; sortIndex: number | null }>();

  const reconciledCategories = categories.map((category) => {
    const normalizedCategory = normalizeCategory(category);

    return {
      ...normalizedCategory,
      docIds: normalizedCategory.docIds.filter((docId, sortIndex) => {
        if (!docs[docId]) {
          console.warn(`Created placeholder document record for "${docId}" from saved categories.`);
          docs[docId] = {
            id: docId,
            title: 'Untitled',
            mode: DEFAULT_DOC_MODE,
            page: createDocumentPage({
              id: docId,
              title: 'Untitled',
              mode: DEFAULT_DOC_MODE,
              categoryIds: [normalizedCategory.id],
              sortIndex,
            }),
          };
        }

        const entry = membership.get(docId) ?? { categoryIds: [], sortIndex: null };
        entry.categoryIds.push(normalizedCategory.id);
        if (entry.sortIndex === null) {
          entry.sortIndex = sortIndex;
        }
        membership.set(docId, entry);
        return true;
      }),
    };
  });

  const reconciledDocs = Object.fromEntries(
    Object.entries(docs).map(([id, doc]) => [
      id,
      {
        ...doc,
        page: normalizeDocumentPage(doc.page, {
          id,
          title: doc.title,
          mode: doc.mode,
          categoryIds: membership.get(id)?.categoryIds ?? [],
          sortIndex: membership.get(id)?.sortIndex ?? null,
        }),
      },
    ]),
  ) as StoredDocs;

  return { categories: reconciledCategories, docs: reconciledDocs };
}

export function initWorldStore(): WorldStore {
  const storedCategories = loadCategories();
  const storedDocs = loadDocs();

  if (storedCategories) {
    const store = reconcileStore(storedCategories, storedDocs ?? {});
    saveCategories(store.categories);
    saveDocs(store.docs);
    return store;
  }

  const seeded = createSeedStore();
  saveCategories(seeded.categories);
  saveDocs(seeded.docs);
  return seeded;
}

export function addDocToCategory(
  store: WorldStore,
  categoryId: string,
  title: string,
): string {
  const id = generateDocId();
  store.docs[id] = {
    id,
    title,
    mode: DEFAULT_DOC_MODE,
    page: createDocumentPage({
      id,
      title,
      mode: DEFAULT_DOC_MODE,
      categoryIds: [categoryId],
    }),
  };

  const category = store.categories.find((c) => c.id === categoryId);
  if (category) {
    category.docIds.push(id);
    syncStoredDocPage(store, id);
  }

  saveDocs(store.docs);
  saveCategories(store.categories);
  return id;
}

export function getDocTitle(store: WorldStore, docId: string): string {
  return store.docs[docId]?.title ?? 'Untitled';
}

export function getDoc(store: WorldStore, docId: string): WorldDoc | null {
  return store.docs[docId] ?? null;
}

export function setDocMode(store: WorldStore, docId: string, mode: EditorMode): void {
  const doc = store.docs[docId];
  if (!doc || doc.mode === mode) return;
  doc.mode = mode;
  syncStoredDocPage(store, docId);
  saveDocs(store.docs);
}

export function saveDocumentPage(store: WorldStore, docId: string, page: DocumentPage): void {
  const doc = store.docs[docId];
  if (!doc) return;
  doc.page = page;
  saveDocs(store.docs);
}

export function getCollaborationSession(docId: string): CollaborationSession {
  const cached = collaborationSessionCache.get(docId);
  if (cached) return cached;

  const session = createCollaborationSession(docId);
  collaborationSessionCache.set(docId, session);
  return session;
}

export function releaseCollaborationSession(docId: string): void {
  const session = collaborationSessionCache.get(docId);
  if (!session) return;
  destroyCollaborationSession(session);
  collaborationSessionCache.delete(docId);
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
  const category: Category = {
    id,
    label: trimmed,
    newLabel,
    docIds: [],
    metadata: { icon: DEFAULT_CATEGORY_ICON_NAME },
  };
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
  for (const docId of removed.docIds) {
    syncStoredDocPage(store, docId);
  }
  saveDocs(store.docs);
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
