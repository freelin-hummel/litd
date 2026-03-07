import {
  addDocToCategory,
  getDoc,
  setDocMode,
  type Category,
  type EditorMode,
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
  modeLabel: string;
  modeDescription: string;
  sidebarMeta: string;
  serializationFormat: 'markdown' | 'canvas';
}

export const PAGE_MODE_DETAILS: Record<EditorMode, PageModeDetails> = {
  document: {
    label: 'Document',
    description: 'Structured block editor view over the shared page model.',
    sidebarMeta: 'Markdown',
    serializationFormat: 'markdown',
  },
  canvas: {
    label: 'Canvas',
    description: 'Spatial canvas view over the shared page model.',
    sidebarMeta: 'Canvas',
    serializationFormat: 'canvas',
  },
};

function toPageMetadata(doc: WorldDoc): PageMetadata {
  const details = PAGE_MODE_DETAILS[doc.mode];

  return {
    ...doc,
    modeLabel: details.label,
    modeDescription: details.description,
    sidebarMeta: details.sidebarMeta,
    serializationFormat: details.serializationFormat,
  };
}

export function getPage(store: WorldStore, pageId: string): PageMetadata | null {
  const doc = getDoc(store, pageId);
  return doc ? toPageMetadata(doc) : null;
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
