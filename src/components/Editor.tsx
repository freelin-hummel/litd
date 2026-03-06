import { useEffect, useRef } from 'react';
import type { Doc } from '@blocksuite/store';
import type { DocMode } from '@blocksuite/blocks';
import type { AffineEditorContainer } from '@blocksuite/presets';
import { Zap } from 'lucide-react';

interface EditorProps {
  doc: Doc | null;
  mode: DocMode;
}

export function Editor({ doc, mode }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<AffineEditorContainer | null>(null);
  // Keep a ref to the current mode so Effect 1 (doc rebuild) can read the
  // latest mode without listing it as a dependency. This is intentional:
  // adding `mode` to Effect 1's deps would cause a full editor teardown/rebuild
  // on every mode change, which is wasteful and causes visible flicker.
  // Effect 2 handles in-place mode switching via `switchEditor()` instead.
  // Because modeRef is updated synchronously at the top of each render, Effect 1
  // always reads the correct mode for the current render cycle.
  const modeRef = useRef<DocMode>(mode);
  modeRef.current = mode;

  // Effect 1 — recreate the editor element when the active doc changes.
  useEffect(() => {
    if (!containerRef.current || !doc) return;

    if (editorRef.current) {
      editorRef.current.remove();
      editorRef.current = null;
    }

    const el = document.createElement('affine-editor-container') as AffineEditorContainer;
    // Set doc AND mode before connecting to DOM to avoid connectedCallback errors.
    el.doc = doc;
    el.mode = modeRef.current;
    el.autofocus = true;
    containerRef.current.appendChild(el);
    editorRef.current = el;

    return () => {
      el.remove();
      editorRef.current = null;
    };
  }, [doc]);

  // Effect 2 — switch mode in-place (no teardown) when only the mode changes.
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.switchEditor(mode);
    }
  }, [mode]);

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

  return <div className="editor-host" ref={containerRef} />;
}
