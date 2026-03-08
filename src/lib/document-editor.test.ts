import { createEditor, $getRoot, type SerializedEditorState } from 'lexical';
import { describe, expect, it } from 'vitest';
import { createDocumentPage, normalizeDocumentPage } from './document';
import {
  createLexicalInitialEditorState,
  syncDocumentPageFromSerializedEditorState,
} from './document-editor';
import { normalizePageContentModel } from './document-pages';

function createParagraphNode(text: string) {
  return {
    children: [
      {
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text,
        type: 'text',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    textFormat: 0,
    textStyle: '',
    type: 'paragraph',
    version: 1,
  };
}

function createSerializedEditorState(...texts: string[]): SerializedEditorState {
  return {
    root: {
      children: texts.map((text) => createParagraphNode(text)),
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  } as unknown as SerializedEditorState;
}

describe('document normalization', () => {
  it('ignores legacy persisted markdown fields while keeping the canonical model', () => {
    const normalized = normalizeDocumentPage(
      {
        markdown: '# Old content',
        updatedAt: '2024-01-01T00:00:00.000Z',
        model: {
          schemaVersion: 1,
          page: {
            id: 'doc-1',
            title: 'Overview',
            mode: 'document',
            categoryIds: ['notes'],
            sortIndex: 0,
            metadata: {
              tags: ['stable'],
              pinned: true,
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
        },
      },
      {
        id: 'doc-1',
        title: 'Overview',
        mode: 'document',
        categoryIds: ['notes'],
        sortIndex: 0,
      },
    );

    expect((normalized as unknown as Record<string, unknown>).markdown).toBeUndefined();
    expect((normalized as unknown as Record<string, unknown>).updatedAt).toBeUndefined();
    expect(normalized.model.page.metadata.pinned).toBe(true);
    expect(normalized.model.page.metadata.tags).toEqual(['stable']);
  });
});

describe('document editor model sync', () => {
  it('stores top-level lexical nodes in the shared page model', () => {
    const page = createDocumentPage({
      id: 'doc-2',
      title: 'Notes',
      mode: 'document',
      categoryIds: ['notes'],
      sortIndex: 0,
    });

    const synced = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Hello shared model'),
    );

    expect(synced.model.rootBlockIds).toHaveLength(1);
    expect(synced.model.rootBlockIds[0]).toMatch(/^block-/);
    expect(synced.model.blocks[synced.model.rootBlockIds[0]]?.type).toBe('paragraph');
  });

  it('rebuilds a parseable lexical editor state from stored blocks', () => {
    const page = createDocumentPage({
      id: 'doc-3',
      title: 'Notes',
      mode: 'document',
    });

    const synced = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Canonical content'),
    );

    const serializedState = createLexicalInitialEditorState(synced);
    expect(serializedState).not.toBeNull();

    const editor = createEditor({
      onError(error) {
        throw error;
      },
    });

    const parsedState = editor.parseEditorState(serializedState!);
    editor.setEditorState(parsedState);

    const textContent = editor.getEditorState().read(() => $getRoot().getTextContent());
    expect(textContent).toBe('Canonical content');
  });

  it('keeps block ids stable for in-place text edits', () => {
    const page = createDocumentPage({
      id: 'doc-4',
      title: 'Notes',
      mode: 'document',
    });

    const firstSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Original text'),
    );
    const originalBlockId = firstSync.model.rootBlockIds[0];

    const secondSync = syncDocumentPageFromSerializedEditorState(
      firstSync,
      createSerializedEditorState('Updated text'),
    );

    expect(secondSync.model.rootBlockIds[0]).toBe(originalBlockId);
  });

  it('keeps block ids stable when unchanged blocks are reordered', () => {
    const page = createDocumentPage({
      id: 'doc-5',
      title: 'Reorder',
      mode: 'document',
    });

    const firstSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Alpha', 'Beta'),
    );
    const [alphaId, betaId] = firstSync.model.rootBlockIds;

    const reordered = syncDocumentPageFromSerializedEditorState(
      firstSync,
      createSerializedEditorState('Beta', 'Alpha'),
    );

    expect(reordered.model.rootBlockIds).toEqual([betaId, alphaId]);
  });

  it('preserves block metadata and entity ids for matched blocks', () => {
    const page = createDocumentPage({
      id: 'doc-6',
      title: 'Metadata',
      mode: 'document',
    });

    const firstSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Track me'),
    );
    const blockId = firstSync.model.rootBlockIds[0];
    firstSync.model.blocks[blockId] = {
      ...firstSync.model.blocks[blockId],
      entityIds: ['entity-1'],
      metadata: {
        ...firstSync.model.blocks[blockId].metadata,
        tags: ['preserve'],
        pinned: true,
      },
    };

    const secondSync = syncDocumentPageFromSerializedEditorState(
      firstSync,
      createSerializedEditorState('Track me please'),
    );

    expect(secondSync.model.rootBlockIds[0]).toBe(blockId);
    expect(secondSync.model.blocks[blockId]?.entityIds).toEqual(['entity-1']);
    expect(secondSync.model.blocks[blockId]?.metadata.tags).toEqual(['preserve']);
    expect(secondSync.model.blocks[blockId]?.metadata.pinned).toBe(true);
  });

  it('removes deleted blocks and prunes dangling relations', () => {
    const page = createDocumentPage({
      id: 'doc-7',
      title: 'Relations',
      mode: 'document',
    });

    const firstSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Alpha', 'Beta'),
    );
    const [alphaId, betaId] = firstSync.model.rootBlockIds;
    firstSync.model.relations = {
      'relation-1': {
        id: 'relation-1',
        sourceId: alphaId,
        targetId: betaId,
        type: 'reference',
        metadata: {},
      },
    };

    const secondSync = syncDocumentPageFromSerializedEditorState(
      firstSync,
      createSerializedEditorState('Alpha'),
    );

    expect(secondSync.model.rootBlockIds).toEqual([alphaId]);
    expect(secondSync.model.blocks[betaId]).toBeUndefined();
    expect(secondSync.model.relations).toEqual({});
  });

  it('round-trips canonical lexical content without drifting block ids', () => {
    const page = createDocumentPage({
      id: 'doc-8',
      title: 'Roundtrip',
      mode: 'document',
    });

    const firstSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('One', 'Two'),
    );
    const serializedState = createLexicalInitialEditorState(firstSync);
    const secondSync = syncDocumentPageFromSerializedEditorState(firstSync, serializedState!);

    expect(secondSync.model.rootBlockIds).toEqual(firstSync.model.rootBlockIds);
    expect(secondSync.model.blocks).toEqual(firstSync.model.blocks);
  });

  it('preserves non-lexical canonical blocks during document edits', () => {
    const page = createDocumentPage({
      id: 'doc-9',
      title: 'Mixed',
      mode: 'document',
    });
    page.model.blocks['canvas-snapshot:doc-9'] = {
      id: 'canvas-snapshot:doc-9',
      type: 'tldraw.snapshot',
      props: {
        tldrawSnapshot: { schema: { schemaVersion: 2, sequences: {} }, store: {} },
      },
      childIds: [],
      entityIds: [],
      metadata: {
        tags: ['canvas'],
        pinned: false,
        customFields: {},
        assetRefs: [],
        mechanics: {},
      },
    };

    const synced = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Document text'),
    );

    expect(synced.model.blocks['canvas-snapshot:doc-9']).toEqual(page.model.blocks['canvas-snapshot:doc-9']);
    expect(synced.model.rootBlockIds).not.toContain('canvas-snapshot:doc-9');
  });
});

describe('page content migrations', () => {
  it('migrates legacy positional block ids to stable ids', () => {
    const normalized = normalizePageContentModel(
      {
        schemaVersion: 1,
        page: {
          id: 'doc-legacy',
          title: 'Legacy',
          mode: 'document',
          categoryIds: [],
          sortIndex: 0,
          metadata: {
            tags: [],
            pinned: false,
            customFields: {},
            assetIds: [],
            grouping: {},
          },
        },
        blocks: {
          'lexical-block:0': {
            id: 'lexical-block:0',
            type: 'paragraph',
            props: { lexicalNode: createParagraphNode('Legacy') },
            childIds: [],
            entityIds: [],
            metadata: {
              tags: ['legacy'],
              pinned: false,
              customFields: {},
              assetRefs: [],
              mechanics: {},
            },
          },
        },
        rootBlockIds: ['lexical-block:0'],
        entities: {},
        relations: {},
        assets: {},
      },
      {
        id: 'doc-legacy',
        title: 'Legacy',
        mode: 'document',
      },
    );

    expect(normalized.schemaVersion).toBeGreaterThanOrEqual(2);
    expect(normalized.rootBlockIds).toHaveLength(1);
    expect(normalized.rootBlockIds[0]).toMatch(/^block-/);
    expect(normalized.blocks[normalized.rootBlockIds[0]]?.metadata.tags).toEqual(['legacy']);
  });
});
