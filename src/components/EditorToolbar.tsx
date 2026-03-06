import type { DocMode } from '@blocksuite/blocks';
import { CanvasModeIcon, PageModeIcon } from '../lib/icons';

interface EditorToolbarProps {
  docTitle: string;
  mode: DocMode;
  onModeChange: (mode: DocMode) => void;
}

export function EditorToolbar({ docTitle, mode, onModeChange }: EditorToolbarProps) {
  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Editor controls">
      <span className="editor-toolbar-title" title={docTitle}>
        {docTitle}
      </span>
      <div className="editor-mode-toggle" role="group" aria-label="Editor mode">
        <button
          className={`editor-mode-btn ${mode === 'page' ? 'active' : ''}`}
          onClick={() => onModeChange('page')}
          aria-pressed={mode === 'page'}
          title="Page editor — structured document"
        >
          <PageModeIcon size={14} aria-hidden="true" />
          Page
        </button>
        <button
          className={`editor-mode-btn ${mode === 'edgeless' ? 'active' : ''}`}
          onClick={() => onModeChange('edgeless')}
          aria-pressed={mode === 'edgeless'}
          title="Canvas editor — maps, diagrams, freeform layout"
        >
          <CanvasModeIcon size={14} aria-hidden="true" />
          Canvas
        </button>
      </div>
    </div>
  );
}
