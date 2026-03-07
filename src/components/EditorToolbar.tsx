import type { EditorMode } from '../lib/collection';
import { PAGE_MODE_DETAILS } from '../lib/pages';
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
          title={PAGE_MODE_DETAILS.document.description}
        >
          <DocumentModeIcon size={14} aria-hidden="true" />
          {PAGE_MODE_DETAILS.document.label}
        </ToggleGroupItem>
        <ToggleGroupItem
          className="editor-mode-btn"
          value="canvas"
          aria-label="Canvas mode"
          title={PAGE_MODE_DETAILS.canvas.description}
        >
          <CanvasModeIcon size={14} aria-hidden="true" />
          {PAGE_MODE_DETAILS.canvas.label}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
