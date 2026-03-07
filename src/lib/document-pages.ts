export type PageId = string;

export type EditorMode = 'document' | 'canvas';

/**
 * App-level page metadata shared by every rendering mode.
 *
 * A page keeps the same identity, title, and sidebar membership whether it is
 * rendered as a structured document or as a canvas. Only the editor
 * implementation is allowed to decide how the page content is loaded and saved.
 */
export interface DocumentPage {
  id: PageId;
  title: string;
  mode: EditorMode;
}

export type BlockId = string;
export type EntityId = string;
export type RelationId = string;

/**
 * Canonical page metadata shared by every renderer.
 *
 * Lexical and canvas are separate editor surfaces, but they are both expected to
 * project the same underlying page identity, mode, and sidebar/category
 * membership instead of inventing editor-specific page ids.
 */
export interface PageRecord extends DocumentPage {
  categoryIds: string[];
  sortIndex: number | null;
}

/**
 * Meaningful content unit that document-mode drag and drop can reorder.
 * Renderers may store app-specific props here while preserving stable block ids.
 */
export interface BlockRecord {
  id: BlockId;
  type: string;
  props: Record<string, unknown>;
  childIds: BlockId[];
  entityIds: EntityId[];
}

/**
 * Named entities referenced by blocks or canvas objects.
 */
export interface EntityRecord {
  id: EntityId;
  type: string;
  metadata: Record<string, unknown>;
}

/**
 * Stable references between blocks and/or entities.
 */
export interface RelationRecord {
  id: RelationId;
  sourceId: string;
  targetId: string;
  type: string;
  metadata: Record<string, unknown>;
}

/**
 * Shared serializable page structure used by both document and canvas views.
 *
 * The current app still renders document content via Lexical and canvas content
 * via tldraw, but both views should hang off this shared page/block/entity/
 * relation model so future schema evolution stays renderer-agnostic.
 */
export interface PageContentModel {
  page: PageRecord;
  blocks: Record<BlockId, BlockRecord>;
  rootBlockIds: BlockId[];
  entities: Record<EntityId, EntityRecord>;
  relations: Record<RelationId, RelationRecord>;
}

interface PageContentModelOptions {
  categoryIds?: string[];
  sortIndex?: number | null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function normalizeRecord<T extends { id: string }>(
  value: unknown,
  normalize: (id: string, entry: unknown) => T | null,
): Record<string, T> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([id, entry]) => {
        const normalized = normalize(id, entry);
        return normalized ? [id, normalized] : null;
      })
      .filter((entry): entry is [string, T] => entry !== null),
  );
}

function normalizeBlockRecord(id: string, value: unknown): BlockRecord | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  return {
    id,
    type: typeof record.type === 'string' && record.type.trim() ? record.type : 'paragraph',
    props:
      record.props !== null && typeof record.props === 'object' && !Array.isArray(record.props)
        ? { ...(record.props as Record<string, unknown>) }
        : {},
    childIds: normalizeStringArray(record.childIds),
    entityIds: normalizeStringArray(record.entityIds),
  };
}

function normalizeEntityRecord(id: string, value: unknown): EntityRecord | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  return {
    id,
    type: typeof record.type === 'string' && record.type.trim() ? record.type : 'entity',
    metadata:
      record.metadata !== null &&
      typeof record.metadata === 'object' &&
      !Array.isArray(record.metadata)
        ? { ...(record.metadata as Record<string, unknown>) }
        : {},
  };
}

function normalizeRelationRecord(id: string, value: unknown): RelationRecord | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  return {
    id,
    sourceId: typeof record.sourceId === 'string' ? record.sourceId : '',
    targetId: typeof record.targetId === 'string' ? record.targetId : '',
    type: typeof record.type === 'string' && record.type.trim() ? record.type : 'reference',
    metadata:
      record.metadata !== null &&
      typeof record.metadata === 'object' &&
      !Array.isArray(record.metadata)
        ? { ...(record.metadata as Record<string, unknown>) }
        : {},
  };
}

export function createPageContentModel(
  page: DocumentPage,
  options: PageContentModelOptions = {},
): PageContentModel {
  return {
    page: {
      ...page,
      categoryIds: [...(options.categoryIds ?? [])],
      sortIndex: options.sortIndex ?? null,
    },
    blocks: {},
    rootBlockIds: [],
    entities: {},
    relations: {},
  };
}

export function normalizePageContentModel(
  value: unknown,
  fallbackPage: DocumentPage,
  options: PageContentModelOptions = {},
): PageContentModel {
  if (value === null || typeof value !== 'object') {
    return createPageContentModel(fallbackPage, options);
  }

  const record = value as Record<string, unknown>;
  const storedPage =
    record.page !== null && typeof record.page === 'object'
      ? (record.page as Record<string, unknown>)
      : {};

  return {
    page: {
      id: fallbackPage.id,
      title: fallbackPage.title,
      mode: fallbackPage.mode,
      categoryIds: normalizeStringArray(storedPage.categoryIds).length
        ? normalizeStringArray(storedPage.categoryIds)
        : [...(options.categoryIds ?? [])],
      sortIndex:
        typeof storedPage.sortIndex === 'number'
          ? storedPage.sortIndex
          : options.sortIndex ?? null,
    },
    blocks: normalizeRecord(record.blocks, normalizeBlockRecord),
    rootBlockIds: normalizeStringArray(record.rootBlockIds),
    entities: normalizeRecord(record.entities, normalizeEntityRecord),
    relations: normalizeRecord(record.relations, normalizeRelationRecord),
  };
}
