import { useCallback, useEffect, useRef } from 'react';
import { DefaultQuickActions, Tldraw } from 'tldraw';
import { Zap } from 'lucide-react';
import type { ThemeId } from '../themes';
import { getThemeMeta } from '../themes';
import { releaseCollaborationSession } from '../lib/collection';
import type { DocumentPage } from '../lib/document';
import type { WorldDoc, WorkspaceMetadata } from '../lib/collection';
import { LexicalDocumentEditor } from './LexicalDocumentEditor';

interface EditorProps {
  doc: WorldDoc | null;
  theme: ThemeId;
  workspace: WorkspaceMetadata;
  onDocumentPageChange: (docId: string, page: DocumentPage) => void;
}

interface CanvasMountedEditor {
  user: {
    updateUserPreferences: (preferences: { colorScheme: 'light' | 'dark' }) => void;
  };
}

function DocumentEditor({
  doc,
  onPageChange,
}: {
  doc: WorldDoc;
  onPageChange: (page: DocumentPage) => void;
}) {
  useEffect(() => {
    const docId = doc.id;

    return () => {
      releaseCollaborationSession(docId);
    };
  }, [doc.id]);

  return <LexicalDocumentEditor key={doc.id} docId={doc.id} page={doc.page} onPageChange={onPageChange} />;
}

const TLDRAW_COMPONENTS = {
  MainMenu: null,
  QuickActions: DefaultQuickActions,
} as const;

function CanvasEditor({
  doc,
  theme,
  workspace,
}: {
  doc: WorldDoc;
  theme: ThemeId;
  workspace: WorkspaceMetadata;
}) {
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
      <div className="editor-canvas-badge">{workspace.modes.canvas.badgeLabel}</div>
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

export function Editor({ doc, theme, workspace, onDocumentPageChange }: EditorProps) {
  if (!doc) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-content">
          <span className="editor-empty-icon" aria-hidden="true">
            <Zap size={48} strokeWidth={1.5} />
          </span>
          <h2>Select a page to begin</h2>
          <p>Choose a page from the sidebar, or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-host">
      {doc.mode === 'canvas' ? (
        <CanvasEditor key={doc.id} doc={doc} theme={theme} workspace={workspace} />
      ) : (
        <DocumentEditor
          key={doc.id}
          doc={doc}
          onPageChange={(page) => onDocumentPageChange(doc.id, page)}
        />
      )}
    </div>
  );
}
