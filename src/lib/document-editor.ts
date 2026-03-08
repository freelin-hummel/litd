import type { ComponentType } from 'react';
import type { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import type { DocumentPage as StoredDocumentPage } from './document';
import type { BlockRecord, DocumentPage } from './document-pages';
import {
  createLexicalNodeFingerprint,
  createStableBlockId,
  getSerializedLexicalNodeBlockId,
  isLegacyPositionalBlockId,
  withSerializedLexicalNodeBlockId,
} from './block-identity';

export interface DocumentEditorSurfaceProps {
  page: DocumentPage;
}

/**
 * Internal boundary for document-mode editors.
 *
 * Non-editor app code works with {@link DocumentPage} metadata only: selecting
 * a page, storing its title, and choosing whether that page renders in document
 * or canvas mode. The concrete editor implementation projects the shared
 * page/block/entity/relation structure into a document editor surface and owns
 * renderer-specific loading, saving, and cleanup behind this boundary so
 * migrations stay local to the editor surface.
 */
export interface DocumentEditorBoundary {
  id: string;
  Surface: ComponentType<DocumentEditorSurfaceProps>;
}

function createDefaultBlockRecord(
  blockId: string,
  node: SerializedLexicalNode & { type: string },
): BlockRecord {
  return {
    id: blockId,
    type: node.type,
    props: {
      lexicalNode: withSerializedLexicalNodeBlockId(node, blockId),
    },
    childIds: [],
    entityIds: [],
    metadata: {
      tags: [],
      pinned: false,
      customFields: {},
      assetRefs: [],
      mechanics: {},
    },
  };
}

function isSerializedLexicalNode(value: unknown): value is SerializedLexicalNode & { type: string } {
  return value !== null && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string';
}

function getStoredLexicalNode(block: BlockRecord | undefined): SerializedLexicalNode | null {
  const lexicalNode = block?.props.lexicalNode;
  if (!isSerializedLexicalNode(lexicalNode) || !block) {
    return null;
  }

  return withSerializedLexicalNodeBlockId(lexicalNode, block.id);
}

function createMatchedBlockRecord(
  existingBlock: BlockRecord,
  node: SerializedLexicalNode & { type: string },
  blockId: string,
): BlockRecord {
  return {
    ...existingBlock,
    id: blockId,
    type: node.type,
    props: {
      ...existingBlock.props,
      lexicalNode: withSerializedLexicalNodeBlockId(node, blockId),
    },
  };
}

function getReusableBlockId(existingBlockId: string | null): string {
  if (!existingBlockId || isLegacyPositionalBlockId(existingBlockId)) {
    return createStableBlockId();
  }

  return existingBlockId;
}

function shiftQueuedBlockId(queue: string[] | undefined, usedBlockIds: Set<string>): string | null {
  if (!queue) {
    return null;
  }

  while (queue.length > 0) {
    const blockId = queue.shift();
    if (blockId && !usedBlockIds.has(blockId)) {
      return blockId;
    }
  }

  return null;
}

function reconcileBlock(
  node: SerializedLexicalNode & { type: string },
  index: number,
  previousRootBlockIds: string[],
  previousBlocks: Record<string, BlockRecord>,
  unusedBlockIdsByFingerprint: Map<string, string[]>,
  usedBlockIds: Set<string>,
): BlockRecord {
  const serializedBlockId = getSerializedLexicalNodeBlockId(node);
  const explicitMatch =
    serializedBlockId &&
    previousBlocks[serializedBlockId] &&
    !usedBlockIds.has(serializedBlockId)
      ? serializedBlockId
      : null;

  const fingerprintMatch = explicitMatch
    ? null
    : shiftQueuedBlockId(
        unusedBlockIdsByFingerprint.get(createLexicalNodeFingerprint(node)),
        usedBlockIds,
      );

  const indexMatch = explicitMatch || fingerprintMatch
    ? null
    : previousRootBlockIds[index] && !usedBlockIds.has(previousRootBlockIds[index])
      ? previousRootBlockIds[index]
      : null;

  const matchedBlockId = explicitMatch ?? fingerprintMatch ?? indexMatch;
  const nextBlockId = getReusableBlockId(matchedBlockId);

  if (matchedBlockId) {
    usedBlockIds.add(matchedBlockId);
    return createMatchedBlockRecord(previousBlocks[matchedBlockId], node, nextBlockId);
  }

  return createDefaultBlockRecord(nextBlockId, node);
}

export function createLexicalInitialEditorState(
  page: StoredDocumentPage,
): SerializedEditorState | null {
  if (page.model.rootBlockIds.length === 0) {
    return null;
  }

  const children = page.model.rootBlockIds
    .map((blockId) => getStoredLexicalNode(page.model.blocks[blockId]))
    .filter((node): node is SerializedLexicalNode => node !== null);

  if (children.length === 0) {
    return null;
  }

  return {
    root: {
      children,
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  };
}

export function syncDocumentPageFromSerializedEditorState(
  page: StoredDocumentPage,
  serializedEditorState: SerializedEditorState,
): StoredDocumentPage {
  const serializedChildren = Array.isArray(serializedEditorState.root.children)
    ? serializedEditorState.root.children.filter(isSerializedLexicalNode)
    : [];

  const previousRootBlockIds = page.model.rootBlockIds;
  const previousBlocks = page.model.blocks;
  const nonRootBlocks = Object.fromEntries(
    Object.entries(previousBlocks).filter(([blockId]) => !previousRootBlockIds.includes(blockId)),
  );
  const unusedBlockIdsByFingerprint = new Map<string, string[]>();
  const usedBlockIds = new Set<string>();

  previousRootBlockIds.forEach((blockId) => {
    const previousBlock = previousBlocks[blockId];
    const previousNode = getStoredLexicalNode(previousBlock);
    if (!previousNode) {
      return;
    }

    const fingerprint = createLexicalNodeFingerprint(previousNode as SerializedLexicalNode & { type: string });
    const queue = unusedBlockIdsByFingerprint.get(fingerprint);
    if (queue) {
      queue.push(blockId);
      return;
    }

    unusedBlockIdsByFingerprint.set(fingerprint, [blockId]);
  });

  const reconciledBlocks = serializedChildren.map((node, index) =>
    reconcileBlock(
      node,
      index,
      previousRootBlockIds,
      previousBlocks,
      unusedBlockIdsByFingerprint,
      usedBlockIds,
    )
  );
  const nextBlocks = {
    ...nonRootBlocks,
    ...Object.fromEntries(reconciledBlocks.map((block) => [block.id, block])),
  };

  return {
    ...page,
    model: {
      ...page.model,
      blocks: nextBlocks,
      rootBlockIds: reconciledBlocks.map((block) => block.id),
    },
  };
}
