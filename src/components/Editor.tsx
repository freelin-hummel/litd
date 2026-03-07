import { useCallback, useEffect, useRef } from 'react';
import { DefaultQuickActions, Tldraw } from 'tldraw';
import { Zap } from 'lucide-react';
import type { ThemeId } from '../themes';
import { getThemeMeta } from '../themes';
import { releaseCollaborationSession, saveDocumentPage } from '../lib/collection';
import type { WorldDoc, WorldStore } from '../lib/collection';
import { LexicalDocumentEditor } from './LexicalDocumentEditor';

interface EditorProps {
  doc: WorldDoc | null;
  theme: ThemeId;
  store: WorldStore;
}

interface CanvasMountedEditor {
  user: {
    updateUserPreferences: (preferences: { colorScheme: 'light' | 'dark' }) => void;
  };
}

function DocumentEditor({ doc, store }: { doc: WorldDoc; store: WorldStore }) {
  useEffect(() => {
    const currentDocId = doc.id;
    return () => releaseCollaborationSession(currentDocId);
  }, [doc.id]);

  return (
    <LexicalDocumentEditor
      docId={doc.id}
      docTitle={doc.title}
      page={doc.page}
      onPageChange={(page) => saveDocumentPage(store, doc.id, page)}
    />
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

export function Editor({ doc, theme, store }: EditorProps) {
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
      {doc.mode === 'canvas' ? (
        <CanvasEditor doc={doc} theme={theme} />
      ) : (
        <DocumentEditor doc={doc} store={store} />
      )}
    </div>
  );
}
