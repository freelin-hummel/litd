import type { TLStoreSnapshot } from '@tldraw/editor';
import type { DocumentPage as StoredDocumentPage } from './document';
import type { BlockId, BlockRecord } from './document-pages';

export const CANVAS_SNAPSHOT_BLOCK_TYPE = 'tldraw.snapshot';

function cloneSnapshot(snapshot: TLStoreSnapshot): TLStoreSnapshot {
  return structuredClone(snapshot);
}

export function getCanvasSnapshotBlockId(pageId: string): BlockId {
  return `canvas-snapshot:${pageId}`;
}

function isCanvasSnapshotBlock(block: BlockRecord | undefined): boolean {
  return block?.type === CANVAS_SNAPSHOT_BLOCK_TYPE;
}

export function getCanvasSnapshotBlock(page: StoredDocumentPage): BlockRecord | null {
  const preferredBlock = page.model.blocks[getCanvasSnapshotBlockId(page.model.page.id)];
  if (isCanvasSnapshotBlock(preferredBlock)) {
    return preferredBlock;
  }

  return (
    Object.values(page.model.blocks).find((block) => isCanvasSnapshotBlock(block)) ?? null
  );
}

export function getCanvasSnapshotFromPage(
  page: StoredDocumentPage,
): TLStoreSnapshot | null {
  const snapshot = getCanvasSnapshotBlock(page)?.props.tldrawSnapshot;
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  return cloneSnapshot(snapshot as TLStoreSnapshot);
}

export function syncCanvasSnapshotToPage(
  page: StoredDocumentPage,
  snapshot: TLStoreSnapshot,
): StoredDocumentPage {
  const blockId = getCanvasSnapshotBlockId(page.model.page.id);
  const previousBlock = getCanvasSnapshotBlock(page);
  const nextBlock: BlockRecord = {
    id: blockId,
    type: CANVAS_SNAPSHOT_BLOCK_TYPE,
    props: {
      ...previousBlock?.props,
      tldrawSnapshot: cloneSnapshot(snapshot),
    },
    childIds: previousBlock?.childIds ?? [],
    entityIds: previousBlock?.entityIds ?? [],
    metadata: previousBlock?.metadata ?? {
      tags: [],
      pinned: false,
      customFields: {},
      assetRefs: [],
      mechanics: {},
    },
  };

  const existingRootBlockIds = page.model.rootBlockIds.filter((id) => id !== previousBlock?.id);
  const nextRootBlockIds =
    existingRootBlockIds.includes(blockId) || page.model.page.mode !== 'canvas'
      ? existingRootBlockIds
      : [...existingRootBlockIds, blockId];
  const nextBlocks = { ...page.model.blocks };
  if (previousBlock && previousBlock.id !== blockId) {
    delete nextBlocks[previousBlock.id];
  }
  nextBlocks[blockId] = nextBlock;

  return {
    ...page,
    model: {
      ...page.model,
      blocks: nextBlocks,
      rootBlockIds: nextRootBlockIds,
    },
  };
}
