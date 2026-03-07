import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DefaultQuickActions, Tldraw } from 'tldraw';
import { Zap } from 'lucide-react';
import type { ThemeId } from '../themes';
import { getThemeMeta } from '../themes';
import { getCollaborationDoc, releaseCollaborationDoc } from '../lib/collection';
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

function DocumentEditor({ doc }: { doc: WorldDoc }) {
  const collaborationDoc = useMemo(() => getCollaborationDoc(doc.id), [doc.id]);

  useEffect(() => {
    const currentDocId = doc.id;
    return () => releaseCollaborationDoc(currentDocId);
  }, [doc.id]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        Placeholder.configure({
          placeholder: 'Start writing your world-building notes…',
          emptyEditorClass: 'is-editor-empty',
        }),
        Collaboration.configure({
          document: collaborationDoc,
          field: 'content',
        }),
      ],
      editorProps: {
        attributes: {
          class: 'editor-document-content',
        },
      },
      immediatelyRender: false,
    },
    [collaborationDoc],
  );

  if (!editor) {
    return (
      <div className="editor-loading">
        <span>Loading document…</span>
      </div>
    );
  }

  return (
    <div className="editor-document-shell">
      <div className="editor-document-inner">
        <EditorContent editor={editor} />
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
