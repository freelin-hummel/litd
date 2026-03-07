import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

/** Category IDs are arbitrary strings; built-in categories use well-known values. */
export type CategoryId = string;

export type EditorMode = 'document' | 'canvas';

export interface Category {
  id: string;
  label: string;
  /** Singular label used in "New <X>" button text */
  newLabel: string;
  docIds: string[];
}

export interface WorldDoc {
  id: string;
  title: string;
  mode: EditorMode;
}

export interface WorldStore {
  categories: Category[];
  docs: Record<string, WorldDoc>;
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
const DOCS_STORAGE_KEY = 'litd:docs';

type StoredDocs = Record<string, WorldDoc>;

const yDocCache = new Map<string, Y.Doc>();
const yPersistenceCache = new Map<string, IndexeddbPersistence>();

function generateDocId(): string {
  return `doc-${crypto.randomUUID()}`;
}

/** Persist the category list (docIds only) to localStorage. */
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
      ((item as Record<string, unknown>).docIds as unknown[]).every(
        (id) => typeof id === 'string',
      ),
  );
}

function isEditorMode(value: unknown): value is EditorMode {
  return value === 'document' || value === 'canvas';
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
    return isValidCategories(parsed) ? parsed : null;
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

function createSeedStore(): WorldStore {
  const categories: Category[] = [
    { id: 'worlds', label: 'Worlds', newLabel: 'World', docIds: [] },
    { id: 'locations', label: 'Locations', newLabel: 'Location', docIds: [] },
    { id: 'factions', label: 'Factions', newLabel: 'Faction', docIds: [] },
    { id: 'characters', label: 'Characters', newLabel: 'Character', docIds: [] },
    { id: 'lore', label: 'Lore & History', newLabel: 'Lore Entry', docIds: [] },
    { id: 'bestiary', label: 'Bestiary', newLabel: 'Entry', docIds: [] },
  ];

  const docs: StoredDocs = {};

  for (const category of categories) {
    const defs = INITIAL_DOCS[category.id] ?? [];
    for (const def of defs) {
      const id = generateDocId();
      docs[id] = {
        id,
        title: def.title,
        mode: def.mode ?? DEFAULT_DOC_MODE,
      };
      category.docIds.push(id);
    }
  }

  return { categories, docs };
}

function reconcileStore(categories: Category[], docs: StoredDocs): WorldStore {
  const reconciledCategories = categories.map((category) => ({
    ...category,
    docIds: category.docIds.filter((docId) => {
      if (docs[docId]) return true;
      console.warn(`Recovered missing document metadata for "${docId}" from saved categories.`);
      docs[docId] = {
        id: docId,
        title: 'Untitled',
        mode: DEFAULT_DOC_MODE,
      };
      return true;
    }),
  }));

  return { categories: reconciledCategories, docs };
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
  };

  const category = store.categories.find((c) => c.id === categoryId);
  if (category) {
    category.docIds.push(id);
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
  saveDocs(store.docs);
}

export function getCollaborationDoc(docId: string): Y.Doc {
  const cached = yDocCache.get(docId);
  if (cached) return cached;

  const yDoc = new Y.Doc();
  yDocCache.set(docId, yDoc);
  yPersistenceCache.set(docId, new IndexeddbPersistence(`litd:tiptap:${docId}`, yDoc));
  return yDoc;
}

export function waitForCollaborationDocSync(docId: string): Promise<void> {
  const persistence = yPersistenceCache.get(docId);
  if (!persistence) return Promise.resolve();
  if (persistence.synced) return Promise.resolve();
  return persistence.whenSynced.then(() => undefined);
}

export function isCollaborationDocSynced(docId: string): boolean {
  return yPersistenceCache.get(docId)?.synced ?? false;
}

export async function loadDocumentEditorState(docId: string): Promise<string | null> {
  getCollaborationDoc(docId);
  const persistence = yPersistenceCache.get(docId);
  if (!persistence) return null;

  await waitForCollaborationDocSync(docId);
  const value = await persistence.get('lexical-editor-state');
  return typeof value === 'string' ? value : null;
}

export async function saveDocumentEditorState(docId: string, editorState: string): Promise<void> {
  getCollaborationDoc(docId);
  const persistence = yPersistenceCache.get(docId);
  if (!persistence) return;
  await persistence.set('lexical-editor-state', editorState);
}

export function releaseCollaborationDoc(docId: string): void {
  yPersistenceCache.get(docId)?.destroy();
  yPersistenceCache.delete(docId);
  yDocCache.get(docId)?.destroy();
  yDocCache.delete(docId);
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
