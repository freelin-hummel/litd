import { useEffect, useRef } from 'react';
import type { Doc } from '@blocksuite/store';
import type { AffineEditorContainer } from '@blocksuite/presets';

interface EditorProps {
  doc: Doc | null;
}

export function Editor({ doc }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);

  // Create the editor element once doc is available
  useEffect(() => {
    if (!containerRef.current || !doc) return;

    // Remove previous editor if any
    if (editorRef.current) {
      editorRef.current.remove();
      editorRef.current = null;
    }

    const el = document.createElement('affine-editor-container') as AffineEditorContainer;
    // Set doc before connecting to DOM to avoid connectedCallback errors
    el.doc = doc;
    el.autofocus = true;
    containerRef.current.appendChild(el);
    editorRef.current = el;

    return () => {
      el.remove();
      editorRef.current = null;
    };
  }, [doc]);

  if (!doc) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-content">
          <span className="editor-empty-icon">⚔️</span>
          <h2>Select a document to begin your adventure</h2>
          <p>Choose an entry from the sidebar, or create a new one.</p>
        </div>
      </div>
    );
  }

  return <div className="editor-host" ref={containerRef} />;
}
