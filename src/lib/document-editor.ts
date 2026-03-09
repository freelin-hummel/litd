import type { ComponentType } from 'react';
import type { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import type { DocumentPage as StoredDocumentPage } from './document';
import type { BlockId, BlockRecord, DocumentPage, RelationRecord } from './document-pages';
import {
  createLexicalNodeFingerprint,
  createLexicalNodeStructureFingerprint,
  createStableBlockId,
  getSerializedLexicalNodeBlockId,
  isLegacyPositionalBlockId,
  withSerializedLexicalNodeBlockId,
} from './block-identity';
import { logSyncDebug } from './sync-debug';

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
  blockId: BlockId,
  node: SerializedLexicalNode & { type: string },
  previousBlock?: BlockRecord,
): BlockRecord {
  return {
    id: blockId,
    type: node.type,
    props: {
      ...previousBlock?.props,
      lexicalNode: withSerializedLexicalNodeBlockId(node, blockId),
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
}

function isSerializedLexicalNode(value: unknown): value is SerializedLexicalNode & { type: string } {
  return value !== null && typeof value === 'object' && typeof (value as { type?: unknown }).type === 'string';
}

function getStoredLexicalNode(
  block: BlockRecord | undefined,
): (SerializedLexicalNode & { type: string }) | null {
  const lexicalNode = block?.props.lexicalNode;
  if (!isSerializedLexicalNode(lexicalNode) || !block) {
    return null;
  }

  return withSerializedLexicalNodeBlockId(lexicalNode, block.id) as SerializedLexicalNode & { type: string };
}

function getPreservedNonLexicalBlocks(
  blocks: Record<BlockId, BlockRecord>,
): Record<BlockId, BlockRecord> {
  return Object.fromEntries(
    Object.entries(blocks).filter(([, block]) => getStoredLexicalNode(block) === null),
  );
}

interface ExistingBlockCandidate {
  id: BlockId;
  index: number;
  block: BlockRecord;
  lexicalNode: SerializedLexicalNode & { type: string };
}

function buildExistingBlockCandidates(page: StoredDocumentPage): ExistingBlockCandidate[] {
  return page.model.rootBlockIds
    .map((blockId, index) => {
      const block = page.model.blocks[blockId];
      const lexicalNode = getStoredLexicalNode(block);
      if (!block || !isSerializedLexicalNode(lexicalNode)) {
        return null;
      }

      return {
        id: blockId,
        index,
        block,
        lexicalNode,
      };
    })
    .filter((candidate): candidate is ExistingBlockCandidate => candidate !== null);
}

function takeMatchingCandidate(
  availableCandidates: Map<BlockId, ExistingBlockCandidate>,
  predicate: (candidate: ExistingBlockCandidate) => boolean,
): ExistingBlockCandidate | null {
  for (const [candidateId, candidate] of availableCandidates.entries()) {
    if (!predicate(candidate)) {
      continue;
    }

    availableCandidates.delete(candidateId);
    return candidate;
  }

  return null;
}

function getReusableBlockId(existingBlockId: string | null): BlockId {
  if (!existingBlockId || isLegacyPositionalBlockId(existingBlockId)) {
    return createStableBlockId();
  }

  return existingBlockId;
}

function resolveBlockIdentity(
  node: SerializedLexicalNode & { type: string },
  index: number,
  availableCandidates: Map<BlockId, ExistingBlockCandidate>,
): ExistingBlockCandidate | null {
  const serializedBlockId = getSerializedLexicalNodeBlockId(node);
  if (serializedBlockId) {
    const explicitMatch = availableCandidates.get(serializedBlockId);
    if (explicitMatch) {
      availableCandidates.delete(serializedBlockId);
      return explicitMatch;
    }
  }

  const exactFingerprint = createLexicalNodeFingerprint(node);
  const exactMatch = takeMatchingCandidate(
    availableCandidates,
    (candidate) => createLexicalNodeFingerprint(candidate.lexicalNode) === exactFingerprint,
  );
  if (exactMatch) {
    return exactMatch;
  }

  const positionalMatch = takeMatchingCandidate(
    availableCandidates,
    (candidate) => candidate.index === index && candidate.block.type === node.type,
  );
  if (positionalMatch) {
    return positionalMatch;
  }

  const structuralFingerprint = createLexicalNodeStructureFingerprint(node);
  const structuralCandidates = [...availableCandidates.values()].filter(
    (candidate) =>
      candidate.block.type === node.type &&
      createLexicalNodeStructureFingerprint(candidate.lexicalNode) === structuralFingerprint,
  );
  if (structuralCandidates.length === 1) {
    const [match] = structuralCandidates;
    availableCandidates.delete(match.id);
    return match;
  }

  return null;
}

function pruneDanglingRelations(
  relations: Record<string, RelationRecord>,
  blockIds: Set<BlockId>,
  entityIds: Set<string>,
): Record<string, RelationRecord> {
  return Object.fromEntries(
    Object.entries(relations).filter(([, relation]) => {
      const sourceIsValid =
        blockIds.has(relation.sourceId) || entityIds.has(relation.sourceId);
      const targetIsValid =
        blockIds.has(relation.targetId) || entityIds.has(relation.targetId);
      return sourceIsValid && targetIsValid;
    }),
  );
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

  const availableCandidates = new Map(
    buildExistingBlockCandidates(page).map((candidate) => [candidate.id, candidate]),
  );
  const preservedNonLexicalBlocks = getPreservedNonLexicalBlocks(page.model.blocks);
  const nextRootBlockIds: BlockId[] = [];
  const lexicalBlocks = Object.fromEntries(
    serializedChildren.map((node, index) => {
      const existingCandidate = resolveBlockIdentity(node, index, availableCandidates);
      const blockId = getReusableBlockId(existingCandidate?.id ?? null);
      const block = createDefaultBlockRecord(blockId, node, existingCandidate?.block);
      nextRootBlockIds.push(block.id);
      return [block.id, block];
    }),
  );
  const nextBlocks = {
    ...preservedNonLexicalBlocks,
    ...lexicalBlocks,
  };
  const validBlockIdSet = new Set(Object.keys(nextBlocks));
  const entityIdSet = new Set(Object.keys(page.model.entities));
  const reusedBlockCount = import.meta.env.DEV
    ? nextRootBlockIds.filter((blockId) => page.model.blocks[blockId]).length
    : 0;

  logSyncDebug('document', 'canonical model updated from lexical', {
    pageId: page.model.page.id,
    blockCount: nextRootBlockIds.length,
    reusedBlockCount,
  });

  return {
    ...page,
    model: {
      ...page.model,
      blocks: nextBlocks,
      rootBlockIds: nextRootBlockIds,
      relations: pruneDanglingRelations(page.model.relations, validBlockIdSet, entityIdSet),
    },
  };
}
