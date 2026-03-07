import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DefaultQuickActions, Tldraw } from 'tldraw';
import { Zap } from 'lucide-react';
import type { ThemeId } from '../themes';
import { getThemeMeta } from '../themes';
import { createLexicalCollaborationProvider } from '../lib/lexicalCollaboration';
import { releaseCollaborationDoc } from '../lib/collection';
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
  useEffect(() => {
    const currentDocId = doc.id;
    return () => releaseCollaborationDoc(currentDocId);
  }, [doc.id]);

  const initialConfig = useMemo<InitialConfigType>(
    () => ({
      namespace: `litd:${doc.id}`,
      editorState: null,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
      onError(error) {
        throw error;
      },
    }),
    [doc.id],
  );

  return (
    <div className="editor-document-shell">
      <div className="editor-document-inner">
        <LexicalComposer key={doc.id} initialConfig={initialConfig}>
          <LexicalCollaboration>
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="editor-document-content" />
              }
              placeholder={
                <div className="editor-document-placeholder">
                  Start writing your world-building notes…
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <CollaborationPlugin
              id={doc.id}
              providerFactory={createLexicalCollaborationProvider}
              shouldBootstrap={true}
            />
          </LexicalCollaboration>
        </LexicalComposer>
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
