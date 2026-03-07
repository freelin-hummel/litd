import { ListItemNode, ListNode } from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { EditorState } from 'lexical';
import { DefaultQuickActions, Tldraw } from 'tldraw';
import { Zap } from 'lucide-react';
import type { ThemeId } from '../themes';
import { getThemeMeta } from '../themes';
import type { WorldDoc } from '../lib/collection';

interface EditorProps {
  doc: WorldDoc | null;
  theme: ThemeId;
}

interface CanvasMountedEditor {
  user: {
    updateUserPreferences: (preferences: { colorScheme: 'light' | 'dark' }) => void;
  };
}

const DOCUMENT_PLACEHOLDER = 'Start writing your world-building notes…';
const DOCUMENT_EDITOR_STORAGE_PREFIX = 'litd:lexical-document:';

function DocumentPlaceholder() {
  return <div className="editor-document-placeholder">{DOCUMENT_PLACEHOLDER}</div>;
}

function getDocumentStorageKey(docId: string): string {
  return `${DOCUMENT_EDITOR_STORAGE_PREFIX}${docId}`;
}

function loadDocumentState(docId: string): string | null {
  try {
    return localStorage.getItem(getDocumentStorageKey(docId));
  } catch {
    return null;
  }
}

function saveDocumentState(docId: string, editorState: EditorState): void {
  try {
    localStorage.setItem(
      getDocumentStorageKey(docId),
      JSON.stringify(editorState.toJSON()),
    );
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }
}

function DocumentEditor({ doc }: { doc: WorldDoc }) {
  const initialConfig = useMemo(
    () => {
      const savedEditorState = loadDocumentState(doc.id);

      return {
        namespace: 'litd-document-editor',
        nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
        onError: (error: Error) => {
          console.error('Lexical document editor error', { docId: doc.id, error });
          throw error;
        },
        ...(savedEditorState ? { editorState: savedEditorState } : {}),
      };
    },
    [doc.id],
  );

  const handleChange = useCallback(
    (editorState: EditorState) => {
      saveDocumentState(doc.id, editorState);
    },
    [doc.id],
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

const TLDRAW_COMPONENTS = {
  MainMenu: null,
  QuickActions: DefaultQuickActions,
} as const;

function CanvasEditor({ doc, theme }: { doc: WorldDoc; theme: ThemeId }) {
  const colorScheme = getThemeMeta(theme).appearance;
  const editorRef = useRef<CanvasMountedEditor | null>(null);

  const syncColorScheme = useCallback((editor: CanvasMountedEditor) => {
    editor.user.updateUserPreferences({ colorScheme });
  }, [colorScheme]);

  useEffect(() => {
    if (editorRef.current) {
      syncColorScheme(editorRef.current);
    }
  }, [syncColorScheme]);

  return (
    <div className="editor-canvas-shell">
      <div className="editor-canvas-badge">Canvas mode</div>
      <Tldraw
        persistenceKey={`litd:tldraw:${doc.id}`}
        components={TLDRAW_COMPONENTS}
        onMount={(editor) => {
          editorRef.current = editor as CanvasMountedEditor;
          syncColorScheme(editor as CanvasMountedEditor);
        }}
      />
    </div>
  );
}

export function Editor({ doc, theme }: EditorProps) {
  if (!doc) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-content">
          <span className="editor-empty-icon" aria-hidden="true">
            <Zap size={48} strokeWidth={1.5} />
          </span>
          <h2>Select a document to begin</h2>
          <p>Choose an entry from the sidebar, or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-host">
      {doc.mode === 'canvas' ? <CanvasEditor doc={doc} theme={theme} /> : <DocumentEditor doc={doc} />}
    </div>
  );
}
