import type { EditorMode, WorkspaceMetadata } from '../lib/collection';
import { CanvasModeIcon, DocumentModeIcon } from '../lib/icons';
import { ToggleGroup, ToggleGroupItem } from '../primitives';

interface EditorToolbarProps {
  docTitle: string;
  mode: EditorMode;
  workspace: WorkspaceMetadata;
  onModeChange: (mode: EditorMode) => void;
}

export function EditorToolbar({ docTitle, mode, workspace, onModeChange }: EditorToolbarProps) {
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
          aria-label={`${workspace.modes.document.label} mode`}
          title={workspace.modes.document.description}
        >
          <DocumentModeIcon size={14} aria-hidden="true" />
          {workspace.modes.document.label}
        </ToggleGroupItem>
        <ToggleGroupItem
          className="editor-mode-btn"
          value="canvas"
          aria-label={`${workspace.modes.canvas.label} mode`}
          title={workspace.modes.canvas.description}
        >
          <CanvasModeIcon size={14} aria-hidden="true" />
          {workspace.modes.canvas.label}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
