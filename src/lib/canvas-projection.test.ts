import type { TLStoreSnapshot } from '@tldraw/editor';
import { describe, expect, it } from 'vitest';
import { createDocumentPage } from './document';
import {
  CANVAS_SNAPSHOT_BLOCK_TYPE,
  getCanvasSnapshotBlockId,
  getCanvasSnapshotFromPage,
  syncCanvasSnapshotToPage,
} from './canvas-projection';

function createCanvasSnapshot(label: string): TLStoreSnapshot {
  return {
    schema: {
      schemaVersion: 2,
      sequences: {},
    },
    store: {
      'document:document': {
        id: 'document:document',
        typeName: 'document',
        name: label,
        gridSize: 10,
      },
      'page:page': {
        id: 'page:page',
        typeName: 'page',
        name: label,
        index: 'a1',
      },
      'shape:text-1': {
        id: 'shape:text-1',
        typeName: 'shape',
        type: 'text',
        parentId: 'page:page',
        index: 'a1',
        x: 10,
        y: 20,
        rotation: 0,
        isLocked: false,
        opacity: 1,
        meta: {},
        props: {
          richText: label,
          color: 'black',
          size: 'm',
          font: 'draw',
          scale: 1,
          textAlign: 'start',
          w: 100,
          autoSize: true,
        },
      },
    },
  } as unknown as TLStoreSnapshot;
}

describe('canvas projection', () => {
  it('stores a canonical tldraw snapshot block for canvas pages', () => {
    const page = createDocumentPage({
      id: 'canvas-1',
      title: 'Board',
      mode: 'canvas',
    });
    const snapshot = createCanvasSnapshot('Board');

    const synced = syncCanvasSnapshotToPage(page, snapshot);
    const blockId = getCanvasSnapshotBlockId('canvas-1');

    expect(synced.model.blocks[blockId]?.type).toBe(CANVAS_SNAPSHOT_BLOCK_TYPE);
    expect(synced.model.rootBlockIds).toContain(blockId);
    expect(getCanvasSnapshotFromPage(synced)).toEqual(snapshot);
  });

  it('preserves block metadata and block identity across repeated canvas syncs', () => {
    const page = createDocumentPage({
      id: 'canvas-2',
      title: 'Board',
      mode: 'canvas',
    });

    const firstSync = syncCanvasSnapshotToPage(page, createCanvasSnapshot('Alpha'));
    const blockId = getCanvasSnapshotBlockId('canvas-2');
    firstSync.model.blocks[blockId] = {
      ...firstSync.model.blocks[blockId],
      metadata: {
        ...firstSync.model.blocks[blockId].metadata,
        tags: ['canvas'],
        pinned: true,
      },
    };

    const secondSync = syncCanvasSnapshotToPage(firstSync, createCanvasSnapshot('Beta'));
    const roundTrippedSnapshot = getCanvasSnapshotFromPage(secondSync);
    const shapeRecord = (roundTrippedSnapshot?.store as Record<string, unknown>)['shape:text-1'] as {
      props?: { richText?: string };
    };

    expect(secondSync.model.blocks[blockId]?.metadata.tags).toEqual(['canvas']);
    expect(secondSync.model.blocks[blockId]?.metadata.pinned).toBe(true);
    expect(shapeRecord.props?.richText).toBe('Beta');
  });
});
