import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useMemo } from 'react';
import type { DocumentEditorBoundary, DocumentEditorSurfaceProps } from '../lib/document-editor';
import { getTipTapDocument, releaseTipTapDocument } from '../lib/tiptap-document-store';

function TipTapDocumentSurface({ page }: DocumentEditorSurfaceProps) {
  const collaborationDoc = useMemo(() => getTipTapDocument(page.id), [page.id]);

  useEffect(() => {
    const currentPageId = page.id;
    return () => releaseTipTapDocument(currentPageId);
  }, [page.id]);

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

export const TIPTAP_DOCUMENT_EDITOR: DocumentEditorBoundary = {
  id: 'tiptap',
  Surface: TipTapDocumentSurface,
};
