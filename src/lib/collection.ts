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

/** Category IDs are arbitrary strings; seeded collections use well-known values. */
export type CategoryId = string;

export type { EditorMode } from './document-pages';

export interface CategoryMetadata {
  icon: CategoryIconName;
  tags: string[];
  pinned: boolean;
  customFields: Record<string, unknown>;
  assetIds: string[];
  grouping: Record<string, string[]>;
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

export interface WorkspaceModeMetadata {
  label: string;
  description: string;
  sidebarMeta: string;
  badgeLabel: string;
}

export interface WorkspaceMetadata {
  title: string;
  subtitle: string;
  modes: Record<EditorMode, WorkspaceModeMetadata>;
}

export interface WorldStore {
  workspace: WorkspaceMetadata;
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

function createDefaultCategoryMetadata(
  icon: CategoryIconName = DEFAULT_CATEGORY_ICON_NAME,
): CategoryMetadata {
  return {
    icon,
    tags: [],
    pinned: false,
    customFields: {},
    assetIds: [],
    grouping: {},
  };
}

const DEFAULT_WORKSPACE_CATEGORY_SEEDS: SeedCategoryDefinition[] = [
  {
    id: 'notes',
    label: 'Notes',
    newLabel: 'Note',
    metadata: createDefaultCategoryMetadata('book-open'),
    docs: [{ title: 'Workspace Overview' }],
  },
  {
    id: 'research',
    label: 'Research',
    newLabel: 'Research Note',
    metadata: createDefaultCategoryMetadata('globe'),
    docs: [
      { title: 'Source Digest' },
      { title: 'Reference Links' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    newLabel: 'Profile',
    metadata: createDefaultCategoryMetadata('user'),
    docs: [
      { title: 'Design Partner Profile' },
      { title: 'Stakeholder Notes' },
    ],
  },
  {
    id: 'spaces',
    label: 'Spaces',
    newLabel: 'Space',
    metadata: createDefaultCategoryMetadata('map-pin'),
    docs: [
      { title: 'Studio Layout' },
      { title: 'Field Research Site' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    newLabel: 'Project',
    metadata: createDefaultCategoryMetadata('folder'),
    docs: [{ title: 'Roadmap Board', mode: 'canvas' }],
  },
];

const DEFAULT_WORKSPACE_CATEGORY_SEEDS_BY_ID = new Map(
  DEFAULT_WORKSPACE_CATEGORY_SEEDS.map((seed) => [seed.id, seed]),
);

/** localStorage keys for persisting metadata. */
const WORKSPACE_STORAGE_KEY = 'litd:workspace';
const CATEGORIES_STORAGE_KEY = 'litd:categories';
const DOCS_STORAGE_KEY = 'litd:docs';

type StoredDocs = Record<string, WorldDoc>;

const collaborationSessionCache = new Map<string, CollaborationSession>();

function createDefaultWorkspaceMetadata(): WorkspaceMetadata {
  return {
    title: 'LITD',
    subtitle: 'Workspace',
    modes: {
      document: {
        label: 'Document',
        description: 'Structured page editor view over the shared workspace model.',
        sidebarMeta: 'Document',
        badgeLabel: 'Document view',
      },
      canvas: {
        label: 'Canvas',
        description: 'Spatial canvas view over the shared workspace model.',
        sidebarMeta: 'Canvas',
        badgeLabel: 'Canvas view',
      },
    },
  };
}

function generateDocId(): string {
  return `doc-${crypto.randomUUID()}`;
}

/** Persist the collection list, including presentation metadata, to localStorage. */
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

function saveWorkspaceMetadata(workspace: WorkspaceMetadata): void {
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
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

/** Derive a reasonable singular form of a collection label for the "New <X>" button. */
function deriveSingular(label: string): string {
  const t = label.trim();
  if (t.toLowerCase().endsWith('ies') && t.length > 3) return t.slice(0, -3) + 'y';
  if (t.toLowerCase().endsWith('es') && t.length > 3) return t.slice(0, -2);
  if (t.toLowerCase().endsWith('s') && t.length > 2) return t.slice(0, -1);
  return t;
}

/** Generate a unique ID for a user-created collection. */
let categoryIdSequence = 0;
function generateCategoryId(): string {
  return `cat-${Date.now().toString(36)}-${(++categoryIdSequence).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeCategoryMetadata(
  value: unknown,
  fallback: CategoryMetadata = createDefaultCategoryMetadata(),
): CategoryMetadata {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ...fallback };
  }

  const record = value as Record<string, unknown>;
  return {
    icon: isCategoryIconName(record.icon) ? record.icon : fallback.icon,
    tags: Array.isArray(record.tags)
      ? record.tags.filter((entry): entry is string => typeof entry === 'string')
      : [...fallback.tags],
    pinned: record.pinned === true ? true : fallback.pinned,
    customFields:
      record.customFields !== null &&
      typeof record.customFields === 'object' &&
      !Array.isArray(record.customFields)
        ? { ...(record.customFields as Record<string, unknown>) }
        : { ...fallback.customFields },
    assetIds: Array.isArray(record.assetIds)
      ? record.assetIds.filter((entry): entry is string => typeof entry === 'string')
      : [...fallback.assetIds],
    grouping:
      record.grouping !== null &&
      typeof record.grouping === 'object' &&
      !Array.isArray(record.grouping)
        ? Object.fromEntries(
            Object.entries(record.grouping).map(([key, entry]) => [
              key,
              Array.isArray(entry)
                ? entry.filter((value): value is string => typeof value === 'string')
                : [],
            ]),
          )
        : { ...fallback.grouping },
  };
}

function normalizeCategory(value: Category): Category {
  const seed = DEFAULT_WORKSPACE_CATEGORY_SEEDS_BY_ID.get(value.id);
  const record = value as unknown as Record<string, unknown>;

  return {
    id: value.id,
    label: value.label,
    newLabel: value.newLabel,
    docIds: value.docIds.filter((docId) => typeof docId === 'string'),
    metadata: normalizeCategoryMetadata(record.metadata, seed?.metadata),
  };
}

function normalizeWorkspaceModeMetadata(
  value: unknown,
  fallback: WorkspaceModeMetadata,
): WorkspaceModeMetadata {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return { ...fallback };
  }

  const record = value as Record<string, unknown>;
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const description = typeof record.description === 'string' ? record.description.trim() : '';
  const sidebarMeta = typeof record.sidebarMeta === 'string' ? record.sidebarMeta.trim() : '';
  const badgeLabel = typeof record.badgeLabel === 'string' ? record.badgeLabel.trim() : '';

  return {
    label: label || fallback.label,
    description: description || fallback.description,
    sidebarMeta: sidebarMeta || fallback.sidebarMeta,
    badgeLabel: badgeLabel || fallback.badgeLabel,
  };
}

function normalizeWorkspaceMetadata(value: unknown): WorkspaceMetadata {
  const fallback = createDefaultWorkspaceMetadata();
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  const subtitle = typeof record.subtitle === 'string' ? record.subtitle.trim() : '';
  const modes = record.modes !== null && typeof record.modes === 'object'
    ? (record.modes as Record<string, unknown>)
    : {};

  return {
    title: title || fallback.title,
    subtitle: subtitle || fallback.subtitle,
    modes: {
      document: normalizeWorkspaceModeMetadata(modes.document, fallback.modes.document),
      canvas: normalizeWorkspaceModeMetadata(modes.canvas, fallback.modes.canvas),
    },
  };
}

/** Load the collection list from localStorage, or return null if not found. */
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

function loadWorkspaceMetadata(): WorkspaceMetadata | null {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return normalizeWorkspaceMetadata(parsed);
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
  const workspace = createDefaultWorkspaceMetadata();
  const categories: Category[] = DEFAULT_WORKSPACE_CATEGORY_SEEDS.map((seed) => ({
    id: seed.id,
    label: seed.label,
    newLabel: seed.newLabel,
    docIds: [],
    metadata: { ...seed.metadata },
  }));

  const docs: StoredDocs = {};

  for (const category of categories) {
    const defs = DEFAULT_WORKSPACE_CATEGORY_SEEDS_BY_ID.get(category.id)?.docs ?? [];
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

  return { workspace, categories, docs };
}

function reconcileStore(
  workspace: WorkspaceMetadata,
  categories: Category[],
  docs: StoredDocs,
): WorldStore {
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

  return {
    workspace: normalizeWorkspaceMetadata(workspace),
    categories: reconciledCategories,
    docs: reconciledDocs,
  };
}

export function initWorldStore(): WorldStore {
  const storedWorkspace = loadWorkspaceMetadata();
  const storedCategories = loadCategories();
  const storedDocs = loadDocs();

  if (storedCategories) {
    const store = reconcileStore(
      storedWorkspace ?? createDefaultWorkspaceMetadata(),
      storedCategories,
      storedDocs ?? {},
    );
    saveWorkspaceMetadata(store.workspace);
    saveCategories(store.categories);
    saveDocs(store.docs);
    return store;
  }

  const seeded = createSeedStore();
  seeded.workspace = storedWorkspace ?? seeded.workspace;
  saveWorkspaceMetadata(seeded.workspace);
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

export function setDocPinned(store: WorldStore, docId: string, pinned: boolean): void {
  const doc = store.docs[docId];
  if (!doc || doc.page.model.page.metadata.pinned === pinned) return;

  doc.page = {
    ...doc.page,
    model: {
      ...doc.page.model,
      page: {
        ...doc.page.model.page,
        metadata: {
          ...doc.page.model.page.metadata,
          pinned,
        },
      },
    },
  };

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

export function updateWorkspaceMetadata(store: WorldStore, workspace: WorkspaceMetadata): void {
  store.workspace = normalizeWorkspaceMetadata(workspace);
  saveWorkspaceMetadata(store.workspace);
}

/**
 * Add a new user-defined category. Throws if the name is empty or already
 * taken by an existing category (case-insensitive).
 */
export function addCategory(store: WorldStore, label: string): Category {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('Collection name cannot be empty.');
  if (
    store.categories.some(
      (c) => c.label.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    throw new Error(`A collection named "${trimmed}" already exists.`);
  }
  const id = generateCategoryId();
  const newLabel = deriveSingular(trimmed);
  const category: Category = {
    id,
    label: trimmed,
    newLabel,
    docIds: [],
    metadata: createDefaultCategoryMetadata(),
  };
  store.categories.push(category);
  saveCategories(store.categories);
  return category;
}

/**
 * Remove a collection from the store.
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
 * Rename an existing collection. Throws if the new name is empty or already
 * taken by another collection (case-insensitive).
 */
export function renameCategory(
  store: WorldStore,
  categoryId: string,
  newLabel: string,
): void {
  const trimmed = newLabel.trim();
  if (!trimmed) throw new Error('Collection name cannot be empty.');
  const category = store.categories.find((c) => c.id === categoryId);
  if (!category) return;
  if (
    store.categories.some(
      (c) => c.id !== categoryId && c.label.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    throw new Error(`A collection named "${trimmed}" already exists.`);
  }
  category.label = trimmed;
  category.newLabel = deriveSingular(trimmed);
  saveCategories(store.categories);
}
