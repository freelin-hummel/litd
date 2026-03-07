import { useCallback, useEffect, useMemo, useRef } from 'react';
import { DefaultQuickActions, Tldraw } from 'tldraw';
import { Zap } from 'lucide-react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeNode } from '@lexical/code';
import type { ThemeId } from '../themes';
import { getThemeMeta } from '../themes';
import { getDocumentMarkdown, setDocumentMarkdown } from '../lib/collection';
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
  const initialMarkdown = useMemo(() => getDocumentMarkdown(doc), [doc]);

  const initialConfig = useMemo(
    () => ({
      namespace: `litd-lexical-${doc.id}`,
      onError(error: Error) {
        throw error;
      },
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, CodeNode],
      editorState: () => {
        $convertFromMarkdownString(initialMarkdown, TRANSFORMERS);
      },
    }),
    [doc.id, initialMarkdown],
  );

  return (
    <div className="editor-document-shell">
      <div className="editor-document-inner">
        <LexicalComposer key={doc.id} initialConfig={initialConfig}>
          <div className="editor-document-editor">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-document-content"
                  aria-label={`Document editor for ${doc.title}`}
                />
              }
              placeholder={
                <div className="editor-document-placeholder">
                  Start writing your world-building notes…
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <HistoryPlugin />
            <ListPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <OnChangePlugin
              ignoreSelectionChange
              onChange={(editorState) => {
                editorState.read(() => {
                  setDocumentMarkdown(doc, $convertToMarkdownString(TRANSFORMERS));
                });
              }}
            />
          </div>
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
