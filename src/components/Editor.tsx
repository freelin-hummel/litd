import type { TLStoreSnapshot } from '@tldraw/editor';
import { useCallback, useEffect, useRef } from 'react';
import { DefaultQuickActions, Tldraw } from 'tldraw';
import { Zap } from 'lucide-react';
import {
  getCanvasSnapshotFromPage,
  syncCanvasSnapshotToPage,
} from '../lib/canvas-projection';
import type { ThemeId } from '../themes';
import { getThemeMeta } from '../themes';
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
  store: {
    getStoreSnapshot: () => TLStoreSnapshot;
    listen: (listener: () => void) => () => void;
  };
  getCurrentPageShapeIds: () => Set<string>;
  loadSnapshot: (snapshot: TLStoreSnapshot) => void;
}

function DocumentEditor({
  doc,
  onPageChange,
}: {
  doc: WorldDoc;
  onPageChange: (page: DocumentPage) => void;
}) {
  return <LexicalDocumentEditor key={doc.id} docId={doc.id} page={doc.page} onPageChange={onPageChange} />;
}

const TLDRAW_COMPONENTS = {
  MainMenu: null,
  QuickActions: DefaultQuickActions,
} as const;

const CANVAS_SAVE_DEBOUNCE_MS = 120;
const CANVAS_CHECKPOINT_BADGE_LABEL = 'canonical checkpoint';

function isCanvasEmpty(editor: CanvasMountedEditor): boolean {
  return editor.getCurrentPageShapeIds().size === 0;
}

function CanvasEditor({
  doc,
  theme,
  workspace,
  onPageChange,
}: {
  doc: WorldDoc;
  theme: ThemeId;
  workspace: WorkspaceMetadata;
  onPageChange: (page: DocumentPage) => void;
}) {
  const colorScheme = getThemeMeta(theme).appearance;
  const editorRef = useRef<CanvasMountedEditor | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const pageRef = useRef(doc.page);
  const canonicalSnapshot = getCanvasSnapshotFromPage(doc.page);

  useEffect(() => {
    pageRef.current = doc.page;
  }, [doc.page]);

  const syncColorScheme = useCallback((editor: CanvasMountedEditor) => {
    editor.user.updateUserPreferences({ colorScheme });
  }, [colorScheme]);

  const flushCanvasSnapshot = useCallback((editor: CanvasMountedEditor) => {
    const nextPage = syncCanvasSnapshotToPage(pageRef.current, editor.store.getStoreSnapshot());
    onPageChange(nextPage);
  }, [onPageChange]);

  useEffect(() => {
    if (editorRef.current) {
      syncColorScheme(editorRef.current);
    }
  }, [syncColorScheme]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    },
    [],
  );

  return (
    <div className="editor-canvas-shell">
      <div className="editor-canvas-badge">
        {workspace.modes.canvas.badgeLabel} · {CANVAS_CHECKPOINT_BADGE_LABEL}
      </div>
      <Tldraw
        persistenceKey={`litd:tldraw:${doc.id}`}
        components={TLDRAW_COMPONENTS}
        onMount={(editor) => {
          const mountedEditor = editor as CanvasMountedEditor;
          editorRef.current = mountedEditor;
          syncColorScheme(mountedEditor);

          if (canonicalSnapshot && isCanvasEmpty(mountedEditor)) {
            mountedEditor.loadSnapshot(canonicalSnapshot);
          }

          const dispose = mountedEditor.store.listen(() => {
            if (saveTimeoutRef.current !== null) {
              window.clearTimeout(saveTimeoutRef.current);
            }

            saveTimeoutRef.current = window.setTimeout(() => {
              flushCanvasSnapshot(mountedEditor);
            }, CANVAS_SAVE_DEBOUNCE_MS);
          });

          return () => {
            if (saveTimeoutRef.current !== null) {
              window.clearTimeout(saveTimeoutRef.current);
              saveTimeoutRef.current = null;
            }
            flushCanvasSnapshot(mountedEditor);
            dispose();
          };
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
    doc.mode === 'canvas' ? (
      <CanvasEditor
        key={doc.id}
        doc={doc}
        theme={theme}
        workspace={workspace}
        onPageChange={(page) => onDocumentPageChange(doc.id, page)}
      />
    ) : (
      <DocumentEditor
        key={doc.id}
        doc={doc}
        onPageChange={(page) => onDocumentPageChange(doc.id, page)}
      />
    )
  );
}
