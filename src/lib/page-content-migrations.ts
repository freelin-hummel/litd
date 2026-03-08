import { createStableBlockId, isLegacyPositionalBlockId } from './block-identity';
import { logSyncDebug } from './sync-debug';

export const PAGE_CONTENT_SCHEMA_VERSION = 2;

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function migrateLegacyPositionalBlockIds(value: Record<string, unknown>): Record<string, unknown> {
  const blocksValue =
    value.blocks !== null && typeof value.blocks === 'object' && !Array.isArray(value.blocks)
      ? (value.blocks as Record<string, unknown>)
      : {};

  const idMap = new Map<string, string>();
  for (const id of Object.keys(blocksValue)) {
    if (isLegacyPositionalBlockId(id)) {
      idMap.set(id, createStableBlockId());
    }
  }

  if (idMap.size === 0) {
    return value;
  }

  const migratedBlocks = Object.fromEntries(
    Object.entries(blocksValue).map(([id, entry]) => {
      const nextId = idMap.get(id) ?? id;
      const block =
        entry !== null && typeof entry === 'object'
          ? { ...(entry as Record<string, unknown>) }
          : {};

      return [
        nextId,
        {
          ...block,
          id: nextId,
          childIds: Array.isArray(block.childIds)
            ? block.childIds.map((childId) =>
                typeof childId === 'string' ? (idMap.get(childId) ?? childId) : childId,
              )
            : [],
        },
      ];
    }),
  );

  const relationsValue =
    value.relations !== null && typeof value.relations === 'object' && !Array.isArray(value.relations)
      ? (value.relations as Record<string, unknown>)
      : {};

  const migratedRelations = Object.fromEntries(
    Object.entries(relationsValue).map(([id, entry]) => {
      const relation =
        entry !== null && typeof entry === 'object'
          ? { ...(entry as Record<string, unknown>) }
          : {};

      return [
        id,
        {
          ...relation,
          sourceId:
            typeof relation.sourceId === 'string'
              ? (idMap.get(relation.sourceId) ?? relation.sourceId)
              : relation.sourceId,
          targetId:
            typeof relation.targetId === 'string'
              ? (idMap.get(relation.targetId) ?? relation.targetId)
              : relation.targetId,
        },
      ];
    }),
  );

  return {
    ...value,
    blocks: migratedBlocks,
    rootBlockIds: Array.isArray(value.rootBlockIds)
      ? value.rootBlockIds.map((blockId) =>
          typeof blockId === 'string' ? (idMap.get(blockId) ?? blockId) : blockId,
        )
      : [],
    relations: migratedRelations,
  };
}

export function migratePageContentModel(value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  let migrated = cloneValue(value as Record<string, unknown>);
  let schemaVersion =
    typeof migrated.schemaVersion === 'number' && Number.isFinite(migrated.schemaVersion)
      ? migrated.schemaVersion
      : 1;

  if (schemaVersion < 2) {
    migrated = migrateLegacyPositionalBlockIds(migrated);
    logSyncDebug('migration', 'applied page-content v2 migration', {
      fromVersion: schemaVersion,
      toVersion: 2,
    });
    schemaVersion = 2;
  }

  return {
    ...migrated,
    schemaVersion: schemaVersion < PAGE_CONTENT_SCHEMA_VERSION ? PAGE_CONTENT_SCHEMA_VERSION : schemaVersion,
  };
}
