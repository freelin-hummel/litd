import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useMemo } from 'react';
import { Tldraw } from 'tldraw';
import { Zap } from 'lucide-react';
import { getCollaborationDoc } from '../lib/collection';
import type { WorldDoc } from '../lib/collection';

interface EditorProps {
  doc: WorldDoc | null;
}

function DocumentEditor({ doc }: { doc: WorldDoc }) {
  const collaborationDoc = useMemo(() => getCollaborationDoc(doc.id), [doc.id]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          undoRedo: false,
        }),
        Placeholder.configure({
          placeholder: 'Start writing your worldbuilding notes…',
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

function CanvasEditor({ doc }: { doc: WorldDoc }) {
  return (
    <div className="editor-canvas-shell">
      <Tldraw persistenceKey={`litd:tldraw:${doc.id}`} />
    </div>
  );
}

export function Editor({ doc }: EditorProps) {
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
      {doc.mode === 'canvas' ? <CanvasEditor doc={doc} /> : <DocumentEditor doc={doc} />}
    </div>
  );
}
