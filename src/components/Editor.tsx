import { useCallback, useEffect, useRef } from 'react';
import { DefaultQuickActions, Tldraw } from 'tldraw';
import { Zap } from 'lucide-react';
import type { ThemeId } from '../themes';
import { getThemeMeta } from '../themes';
import { releaseCollaborationSession } from '../lib/collection';
import type { WorldDoc } from '../lib/collection';
import { LexicalDocumentEditor } from './LexicalDocumentEditor';

interface EditorProps {
  doc: WorldDoc | null;
  theme: ThemeId;
}

interface CanvasMountedEditor {
  user: {
    updateUserPreferences: (preferences: { colorScheme: 'light' | 'dark' }) => void;
  };
}

function DocumentEditor({ doc }: { doc: WorldDoc }) {
  useEffect(() => {
    const docId = doc.id;

    return () => {
      releaseCollaborationSession(docId);
    };
  }, [doc.id]);

  return <LexicalDocumentEditor key={doc.id} docId={doc.id} docTitle={doc.title} page={doc.page} />;
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
      {doc.mode === 'canvas' ? (
        <CanvasEditor key={doc.id} doc={doc} theme={theme} />
      ) : (
        <DocumentEditor key={doc.id} doc={doc} />
      )}
    </div>
  );
}
