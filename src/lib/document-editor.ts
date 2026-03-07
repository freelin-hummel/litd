import type { ComponentType } from 'react';
import type { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import type { DocumentPage as StoredDocumentPage } from './document';
import type { BlockRecord, DocumentPage } from './document-pages';

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

const LEXICAL_BLOCK_ID_PREFIX = 'lexical-block';

function createLexicalBlockId(index: number): string {
  return `${LEXICAL_BLOCK_ID_PREFIX}:${index}`;
}

function createDefaultBlockRecord(
  index: number,
  node: SerializedLexicalNode & { type: string },
): BlockRecord {
  return {
    id: createLexicalBlockId(index),
    type: node.type,
    props: {
      lexicalNode: JSON.parse(JSON.stringify(node)) as SerializedLexicalNode,
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
  return isSerializedLexicalNode(lexicalNode)
    ? (JSON.parse(JSON.stringify(lexicalNode)) as SerializedLexicalNode)
    : null;
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

  const nextBlocks = Object.fromEntries(
    serializedChildren.map((node, index) => {
      const block = createDefaultBlockRecord(index, node);
      return [block.id, block];
    }),
  );

  return {
    ...page,
    model: {
      ...page.model,
      blocks: nextBlocks,
      rootBlockIds: serializedChildren.map((_, index) => createLexicalBlockId(index)),
    },
  };
}
