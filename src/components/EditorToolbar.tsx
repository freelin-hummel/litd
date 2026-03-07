import type { EditorMode } from '../lib/collection';
import { CanvasModeIcon, DocumentModeIcon } from '../lib/icons';
import { ToggleGroup, ToggleGroupItem } from '../primitives';

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
      <ToggleGroup
        className="editor-mode-toggle"
        type="single"
        value={mode}
        onValueChange={(value) => {
          if (value === 'document' || value === 'canvas') {
            onModeChange(value);
          }
        }}
        aria-label="Editor mode"
      >
        <ToggleGroupItem
          className="editor-mode-btn"
          value="document"
          aria-label="Document mode"
          title="Structured rich text powered by Lexical."
        >
          <DocumentModeIcon size={14} aria-hidden="true" />
          Document
        </ToggleGroupItem>
        <ToggleGroupItem
          className="editor-mode-btn"
          value="canvas"
          aria-label="Canvas mode"
          title="Freeform maps and diagrams powered by tldraw."
        >
          <CanvasModeIcon size={14} aria-hidden="true" />
          Canvas
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
