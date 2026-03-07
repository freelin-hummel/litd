import { createEditor, $getRoot, type SerializedEditorState } from 'lexical';
import { describe, expect, it } from 'vitest';
import { createDocumentPage, normalizeDocumentPage } from './document';
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

    expect(synced.model.rootBlockIds).toEqual(['lexical-block:0']);
    expect(synced.model.blocks['lexical-block:0']?.type).toBe('paragraph');
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
});