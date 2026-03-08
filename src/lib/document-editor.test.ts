import { createEditor, $getRoot, type SerializedEditorState } from 'lexical';
import { describe, expect, it } from 'vitest';
import { createDocumentPage, normalizeDocumentPage } from './document';
import { isLegacyPositionalBlockId } from './block-identity';
import {
  createLexicalInitialEditorState,
  syncDocumentPageFromSerializedEditorState,
} from './document-editor';

function createSerializedEditorState(text: string): SerializedEditorState {
  return {
    root: {
      children: [
        {
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
        },
      ],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  } as unknown as SerializedEditorState;
}

function createSerializedEditorStateFromParagraphs(...texts: string[]): SerializedEditorState {
  return {
    root: {
      children: texts.map((text) => ({
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
      })),
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

  it('keeps block ids stable when blocks reorder with unchanged content', () => {
    const page = createDocumentPage({
      id: 'doc-5',
      title: 'Notes',
      mode: 'document',
    });

    const initialSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorStateFromParagraphs('First', 'Second'),
    );
    const [firstId, secondId] = initialSync.model.rootBlockIds;

    const reorderedSync = syncDocumentPageFromSerializedEditorState(
      initialSync,
      createSerializedEditorStateFromParagraphs('Second', 'First'),
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
        lexicalNode: createSerializedEditorState('Legacy').root.children[0],
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

  it('removes deleted top-level blocks cleanly while preserving unrelated records', () => {
    const page = createDocumentPage({
      id: 'doc-7',
      title: 'Notes',
      mode: 'document',
    });

    const initialSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorStateFromParagraphs('Keep', 'Delete'),
    );
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

    const nextSync = syncDocumentPageFromSerializedEditorState(
      initialSync,
      createSerializedEditorState('Keep'),
    );

    expect(nextSync.model.rootBlockIds).toHaveLength(1);
    expect(nextSync.model.blocks['nested-block']).toBeDefined();
    expect(
      Object.keys(nextSync.model.blocks).filter((blockId) => blockId !== 'nested-block'),
    ).toEqual(nextSync.model.rootBlockIds);
  });

  it('does not drift across canonical to editor to canonical cycles', () => {
    const page = createDocumentPage({
      id: 'doc-8',
      title: 'Notes',
      mode: 'document',
    });

    const firstSync = syncDocumentPageFromSerializedEditorState(
      page,
      createSerializedEditorStateFromParagraphs('Alpha', 'Beta'),
    );
    const reconstructed = createLexicalInitialEditorState(firstSync);
    expect(reconstructed).not.toBeNull();

    const secondSync = syncDocumentPageFromSerializedEditorState(firstSync, reconstructed!);
    expect(secondSync.model).toEqual(firstSync.model);
  });
});
