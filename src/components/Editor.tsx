import { useCallback, useEffect, useRef } from 'react';
import { DefaultQuickActions, Tldraw } from 'tldraw';
import { Zap } from 'lucide-react';
import type { ThemeId } from '../themes';
import { getThemeMeta } from '../themes';
import type { DocumentEditorBoundary } from '../lib/document-editor';
import type { DocumentPage } from '../lib/document-pages';
import { TIPTAP_DOCUMENT_EDITOR } from './TipTapDocumentEditor';

interface EditorProps {
  page: DocumentPage | null;
  theme: ThemeId;
  documentEditor?: DocumentEditorBoundary;
}

interface CanvasMountedEditor {
  user: {
    updateUserPreferences: (preferences: { colorScheme: 'light' | 'dark' }) => void;
  };
}

function DocumentEditor({
  page,
  documentEditor,
}: {
  page: DocumentPage;
  documentEditor: DocumentEditorBoundary;
}) {
  const Surface = documentEditor.Surface;
  return <Surface page={page} />;
}

const TLDRAW_COMPONENTS = {
  MainMenu: null,
  QuickActions: DefaultQuickActions,
} as const;

function CanvasEditor({ page, theme }: { page: DocumentPage; theme: ThemeId }) {
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
        persistenceKey={`litd:tldraw:${page.id}`}
        components={TLDRAW_COMPONENTS}
        onMount={(editor) => {
          editorRef.current = editor as CanvasMountedEditor;
          syncColorScheme(editor as CanvasMountedEditor);
        }}
      />
    </div>
  );
}

export function Editor({
  page,
  theme,
  documentEditor = TIPTAP_DOCUMENT_EDITOR,
}: EditorProps) {
  if (!page) {
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
      {page.mode === 'canvas' ? (
        <CanvasEditor page={page} theme={theme} />
      ) : (
        <DocumentEditor page={page} documentEditor={documentEditor} />
      )}
    </div>
  );
}
