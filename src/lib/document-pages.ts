import {
  PAGE_CONTENT_SCHEMA_VERSION,
  migratePageContentModel,
} from './page-content-migrations';

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
export type AssetId = string;

export interface OrganizationMetadata {
  tags: string[];
  pinned: boolean;
  customFields: Record<string, unknown>;
  assetIds: AssetId[];
  grouping: Record<string, string[]>;
}

export interface AssetReference {
  assetId: AssetId;
  renderMode: 'link' | 'embed' | 'page' | 'region';
  metadata: Record<string, unknown>;
}

export interface BlockMetadata {
  tags: string[];
  pinned: boolean;
  customFields: Record<string, unknown>;
  assetRefs: AssetReference[];
  mechanics: Record<string, unknown>;
}

export interface AssetRecord {
  id: AssetId;
  type: 'file' | 'image' | 'pdf';
  title: string;
  mimeType: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
}

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
  metadata: OrganizationMetadata;
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
  metadata: BlockMetadata;
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
 *
 * Serialization rules:
 * - page/block/entity/relation/asset ids are stable string identifiers
 * - persisted records are normalized through normalizePageContentModel()
 * - renderers may cache derived state, but this model is the canonical source
 *   of truth that should be stored and migrated over time
 */
export interface PageContentModel {
  /** Tracks canonical schema evolution for storage normalization and migrations. */
  schemaVersion: number;
  page: PageRecord;
  blocks: Record<BlockId, BlockRecord>;
  rootBlockIds: BlockId[];
  entities: Record<EntityId, EntityRecord>;
  relations: Record<RelationId, RelationRecord>;
  assets: Record<AssetId, AssetRecord>;
}

interface PageContentModelOptions {
  categoryIds?: string[];
  sortIndex?: number | null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function normalizeObjectRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function normalizeGroupingRecord(value: unknown): Record<string, string[]> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, normalizeStringArray(entry)]),
  );
}

function normalizeAssetReference(value: unknown): AssetReference | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const renderMode = record.renderMode;

  return typeof record.assetId === 'string' && record.assetId
    ? {
        assetId: record.assetId,
        renderMode:
          renderMode === 'embed' || renderMode === 'page' || renderMode === 'region'
            ? renderMode
            : 'link',
        metadata: normalizeObjectRecord(record.metadata),
      }
    : null;
}

function normalizeAssetReferenceArray(value: unknown): AssetReference[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => normalizeAssetReference(entry))
    .filter((entry): entry is AssetReference => entry !== null);
}

function normalizeOrganizationMetadata(value: unknown): OrganizationMetadata {
  const record = normalizeObjectRecord(value);

  return {
    tags: normalizeStringArray(record.tags),
    pinned: record.pinned === true,
    customFields: normalizeObjectRecord(record.customFields),
    assetIds: normalizeStringArray(record.assetIds),
    grouping: normalizeGroupingRecord(record.grouping),
  };
}

function normalizeBlockMetadata(value: unknown): BlockMetadata {
  const record = normalizeObjectRecord(value);

  return {
    tags: normalizeStringArray(record.tags),
    pinned: record.pinned === true,
    customFields: normalizeObjectRecord(record.customFields),
    assetRefs: normalizeAssetReferenceArray(record.assetRefs),
    mechanics: normalizeObjectRecord(record.mechanics),
  };
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
      normalizeObjectRecord(record.props),
    childIds: normalizeStringArray(record.childIds),
    entityIds: normalizeStringArray(record.entityIds),
    metadata: normalizeBlockMetadata(record.metadata),
  };
}

function normalizeEntityRecord(id: string, value: unknown): EntityRecord | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;

  return {
    id,
    type: typeof record.type === 'string' && record.type.trim() ? record.type : 'entity',
    metadata: normalizeObjectRecord(record.metadata),
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
      normalizeObjectRecord(record.metadata),
  };
}

function normalizeAssetRecord(id: string, value: unknown): AssetRecord | null {
  if (value === null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const type = record.type;

  return {
    id,
    type: type === 'image' || type === 'pdf' ? type : 'file',
    title: typeof record.title === 'string' && record.title.trim() ? record.title : id,
    mimeType: typeof record.mimeType === 'string' && record.mimeType.trim() ? record.mimeType : null,
    tags: normalizeStringArray(record.tags),
    metadata: normalizeObjectRecord(record.metadata),
  };
}

export function createPageContentModel(
  page: DocumentPage,
  options: PageContentModelOptions = {},
): PageContentModel {
  return {
    schemaVersion: PAGE_CONTENT_SCHEMA_VERSION,
    page: {
      ...page,
      categoryIds: [...(options.categoryIds ?? [])],
      sortIndex: options.sortIndex ?? null,
      metadata: {
        tags: [],
        pinned: false,
        customFields: {},
        assetIds: [],
        grouping: {},
      },
    },
    blocks: {},
    rootBlockIds: [],
    entities: {},
    relations: {},
    assets: {},
  };
}

export function normalizePageContentModel(
  value: unknown,
  fallbackPage: DocumentPage,
  options: PageContentModelOptions = {},
): PageContentModel {
  const migratedValue = migratePageContentModel(value);

  if (migratedValue === null || typeof migratedValue !== 'object') {
    return createPageContentModel(fallbackPage, options);
  }

  const record = migratedValue as Record<string, unknown>;
  const storedPage =
    record.page !== null && typeof record.page === 'object'
      ? (record.page as Record<string, unknown>)
      : {};

  return {
    schemaVersion:
      typeof record.schemaVersion === 'number' && Number.isFinite(record.schemaVersion)
        ? record.schemaVersion
        : PAGE_CONTENT_SCHEMA_VERSION,
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
      metadata: normalizeOrganizationMetadata(storedPage.metadata),
    },
    blocks: normalizeRecord(record.blocks, normalizeBlockRecord),
    rootBlockIds: normalizeStringArray(record.rootBlockIds),
    entities: normalizeRecord(record.entities, normalizeEntityRecord),
    relations: normalizeRecord(record.relations, normalizeRelationRecord),
    assets: normalizeRecord(record.assets, normalizeAssetRecord),
  };
}
