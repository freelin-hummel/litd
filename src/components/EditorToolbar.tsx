import type { EditorMode } from '../lib/collection';
import { CanvasModeIcon, DocumentModeIcon } from '../lib/icons';

interface EditorToolbarProps {
  docTitle: string;
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}

export function EditorToolbar({ docTitle, mode, onModeChange }: EditorToolbarProps) {
  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Editor controls">
      <span className="editor-toolbar-title" title={docTitle}>
        {docTitle}
      </span>
      <div className="editor-mode-toggle" role="group" aria-label="Editor mode">
        <button
          className={`editor-mode-btn ${mode === 'document' ? 'active' : ''}`}
          onClick={() => onModeChange('document')}
          aria-pressed={mode === 'document'}
          title="Document editor — collaborative rich text powered by TipTap"
        >
          <DocumentModeIcon size={14} aria-hidden="true" />
          Document
        </button>
        <button
          className={`editor-mode-btn ${mode === 'canvas' ? 'active' : ''}`}
          onClick={() => onModeChange('canvas')}
          aria-pressed={mode === 'canvas'}
          title="Canvas editor — freeform maps and diagrams powered by tldraw"
        >
          <CanvasModeIcon size={14} aria-hidden="true" />
          Canvas
        </button>
      </div>
    </div>
  );
}
