import { ListItemNode, ListNode } from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import type { EditorState } from 'lexical';
import { useCallback, useMemo } from 'react';
import type { DocumentEditorBoundary, DocumentEditorSurfaceProps } from '../lib/document-editor';

const DOCUMENT_PLACEHOLDER = 'Start writing your world-building notes…';
const DOCUMENT_EDITOR_STORAGE_PREFIX = 'litd:lexical-document:';

function DocumentPlaceholder() {
  return <div className="editor-document-placeholder">{DOCUMENT_PLACEHOLDER}</div>;
}

function getDocumentStorageKey(pageId: string): string {
  return `${DOCUMENT_EDITOR_STORAGE_PREFIX}${pageId}`;
}

function loadDocumentState(pageId: string): string | null {
  try {
    return localStorage.getItem(getDocumentStorageKey(pageId));
  } catch {
    return null;
  }
}

function saveDocumentState(pageId: string, editorState: EditorState): void {
  try {
    localStorage.setItem(
      getDocumentStorageKey(pageId),
      JSON.stringify(editorState.toJSON()),
    );
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }
}

function LexicalDocumentSurface({ page }: DocumentEditorSurfaceProps) {
  const initialConfig = useMemo(() => {
    const savedEditorState = loadDocumentState(page.id);

    return {
      namespace: 'litd-document-editor',
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
      onError: (error: Error) => {
        console.error('Lexical document editor error', { pageId: page.id, error });
        throw error;
      },
      ...(savedEditorState ? { editorState: savedEditorState } : {}),
    };
  }, [page.id]);

  const handleChange = useCallback(
    (editorState: EditorState) => {
      saveDocumentState(page.id, editorState);
    },
    [page.id],
  );

  return (
    <div className="editor-document-shell">
      <div className="editor-document-inner">
        <div className="editor-document-surface">
          <LexicalComposer initialConfig={initialConfig}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  aria-label="Document editor"
                  className="editor-document-content"
                />
              }
              placeholder={<DocumentPlaceholder />}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <ListPlugin />
            <OnChangePlugin onChange={handleChange} />
          </LexicalComposer>
        </div>
      </div>
    </div>
  );
}

export const LEXICAL_DOCUMENT_EDITOR: DocumentEditorBoundary = {
  id: 'lexical',
  Surface: LexicalDocumentSurface,
};
