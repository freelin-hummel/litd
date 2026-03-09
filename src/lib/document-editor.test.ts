import { createEditor, $getRoot, type SerializedEditorState } from 'lexical';
import { describe, expect, it } from 'vitest';
import { createDocumentPage, normalizeDocumentPage } from './document';
import { isLegacyPositionalBlockId } from './block-identity';
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

  it('preserves stable ids and metadata across text edits', () => {
    const page = createDocumentPage({
      id: 'doc-4',
      title: 'Notes',
      mode: 'document',
    });

    const firstSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Original text'),
    );
    const [blockId] = firstSync.model.rootBlockIds;
    const firstBlock = firstSync.model.blocks[blockId];

    firstBlock.metadata.tags = ['stable'];
    firstBlock.metadata.pinned = true;
    firstBlock.metadata.customFields = { priority: 'high' };
    firstBlock.metadata.assetRefs = [{ assetId: 'asset-1', renderMode: 'embed', metadata: { alt: 'x' } }];
    firstBlock.metadata.mechanics = { difficulty: 3 };
    firstBlock.entityIds = ['entity-1'];
    firstBlock.props.extra = 'preserved';

    const secondSync = syncDocumentPageFromSerializedEditorState(
      firstSync,
      createSerializedEditorState('Edited text'),
    );
    const [secondBlockId] = secondSync.model.rootBlockIds;
    const secondBlock = secondSync.model.blocks[secondBlockId];

    expect(secondBlockId).toBe(blockId);
    expect(secondBlock.metadata).toEqual(firstBlock.metadata);
    expect(secondBlock.entityIds).toEqual(['entity-1']);
    expect(secondBlock.props.extra).toBe('preserved');
  });

  it('keeps block ids stable when unchanged blocks are reordered', () => {
    const page = createDocumentPage({
      id: 'doc-5',
      title: 'Notes',
      mode: 'document',
    });

    const initialSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('First', 'Second'),
    );
    const [firstId, secondId] = initialSync.model.rootBlockIds;

    const reorderedSync = syncDocumentPageFromSerializedEditorState(
      initialSync,
      createSerializedEditorState('Second', 'First'),
    );

    expect(reorderedSync.model.rootBlockIds).toEqual([secondId, firstId]);
  });

  it('migrates legacy positional ids to stable ids while preserving metadata', () => {
    const page = createDocumentPage({
      id: 'doc-6',
      title: 'Notes',
      mode: 'document',
    });

    page.model.rootBlockIds = ['lexical-block:0'];
    page.model.blocks['lexical-block:0'] = {
      id: 'lexical-block:0',
      type: 'paragraph',
      props: {
        lexicalNode: createParagraphNode('Legacy'),
      },
      childIds: [],
      entityIds: ['entity-legacy'],
      metadata: {
        tags: ['legacy'],
        pinned: true,
        customFields: { keep: true },
        assetRefs: [],
        mechanics: { migrated: true },
      },
    };

    const migrated = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Legacy updated'),
    );
    const [nextBlockId] = migrated.model.rootBlockIds;
    const nextBlock = migrated.model.blocks[nextBlockId];

    expect(isLegacyPositionalBlockId(nextBlockId)).toBe(false);
    expect(nextBlock.metadata.tags).toEqual(['legacy']);
    expect(nextBlock.entityIds).toEqual(['entity-legacy']);
    expect(migrated.model.blocks['lexical-block:0']).toBeUndefined();
  });

  it('removes deleted blocks and prunes dangling relations', () => {
    const page = createDocumentPage({
      id: 'doc-7',
      title: 'Notes',
      mode: 'document',
    });

    const initialSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Keep', 'Delete'),
    );
    const [keepId, deleteId] = initialSync.model.rootBlockIds;
    initialSync.model.blocks['nested-block'] = {
      id: 'nested-block',
      type: 'callout',
      props: {},
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
    initialSync.model.relations = {
      'relation-1': {
        id: 'relation-1',
        sourceId: keepId,
        targetId: deleteId,
        type: 'reference',
        metadata: {},
      },
    };

    const nextSync = syncDocumentPageFromSerializedEditorState(
      initialSync,
      createSerializedEditorState('Keep'),
    );

    expect(nextSync.model.rootBlockIds).toEqual([keepId]);
    expect(nextSync.model.blocks[deleteId]).toBeUndefined();
    expect(nextSync.model.blocks['nested-block']).toBeDefined();
    expect(nextSync.model.relations).toEqual({});
  });

  it('preserves non-lexical canonical blocks during document edits', () => {
    const page = createDocumentPage({
      id: 'doc-8',
      title: 'Mixed',
      mode: 'document',
    });
    page.model.blocks['canvas-snapshot:doc-8'] = {
      id: 'canvas-snapshot:doc-8',
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
    page.model.rootBlockIds = ['canvas-snapshot:doc-8'];

    const synced = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Document text'),
    );

    expect(synced.model.blocks['canvas-snapshot:doc-8']).toEqual(page.model.blocks['canvas-snapshot:doc-8']);
    expect(synced.model.rootBlockIds).not.toContain('canvas-snapshot:doc-8');
  });

  it('does not drift across canonical to editor to canonical cycles', () => {
    const page = createDocumentPage({
      id: 'doc-9',
      title: 'Notes',
      mode: 'document',
    });

    const firstSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorState('Alpha', 'Beta'),
    );
    const reconstructed = createLexicalInitialEditorState(firstSync);
    expect(reconstructed).not.toBeNull();

    const secondSync = syncDocumentPageFromSerializedEditorState(firstSync, reconstructed!);
    expect(secondSync.model).toEqual(firstSync.model);
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
