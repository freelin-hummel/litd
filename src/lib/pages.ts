import {
  addDocToCategory,
  getDoc,
  setDocMode,
  type Category,
  type EditorMode,
  type WorkspaceModeMetadata,
  type WorldDoc,
  type WorldStore,
} from './collection';

interface PageModeDetails {
  label: string;
  description: string;
  sidebarMeta: string;
  serializationFormat: 'markdown' | 'canvas';
}

export interface PageMetadata extends WorldDoc {
  categoryIds: string[];
  sortIndex: number | null;
  tags: string[];
  pinned: boolean;
  customFields: Record<string, unknown>;
  assetIds: string[];
  grouping: Record<string, string[]>;
  modeLabel: string;
  modeDescription: string;
  sidebarMeta: string;
  serializationFormat: 'markdown' | 'canvas';
}

export function getPageModeDetails(store: WorldStore, mode: EditorMode): PageModeDetails {
  const metadata: WorkspaceModeMetadata = store.workspace.modes[mode];

  return {
    label: metadata.label,
    description: metadata.description,
    sidebarMeta: metadata.sidebarMeta,
    serializationFormat: mode === 'document' ? 'markdown' : 'canvas',
  };
}

function buildPageMetadata(store: WorldStore, doc: WorldDoc): PageMetadata {
  const details = getPageModeDetails(store, doc.mode);
  const canonicalPage = doc.page.model.page;

  return {
    ...doc,
    categoryIds: [...canonicalPage.categoryIds],
    sortIndex: canonicalPage.sortIndex,
    tags: [...canonicalPage.metadata.tags],
    pinned: canonicalPage.metadata.pinned,
    customFields: { ...canonicalPage.metadata.customFields },
    assetIds: [...canonicalPage.metadata.assetIds],
    grouping: Object.fromEntries(
      Object.entries(canonicalPage.metadata.grouping).map(([key, values]) => [key, [...values]]),
    ),
    modeLabel: details.label,
    modeDescription: details.description,
    sidebarMeta: details.sidebarMeta,
    serializationFormat: details.serializationFormat,
  };
}

export function getPage(store: WorldStore, pageId: string): PageMetadata | null {
  const doc = getDoc(store, pageId);
  return doc ? buildPageMetadata(store, doc) : null;
}

export function getPageTitle(store: WorldStore, pageId: string): string {
  return getPage(store, pageId)?.title ?? 'Untitled';
}

export function listCategoryPages(store: WorldStore, category: Category): PageMetadata[] {
  return category.docIds
    .map((pageId) => getPage(store, pageId))
    .filter((page): page is PageMetadata => page !== null);
}

export function createPageInCategory(
  store: WorldStore,
  categoryId: string,
  title: string,
): string {
  return addDocToCategory(store, categoryId, title);
}

export function setPageMode(store: WorldStore, pageId: string, mode: EditorMode): void {
  setDocMode(store, pageId, mode);
}

export function getAllPageIds(store: WorldStore): string[] {
  return store.categories.flatMap((category) => category.docIds);
}

export function getInitialActivePageId(store: WorldStore): string | null {
  return getAllPageIds(store)[0] ?? null;
}
