import type { ComponentType } from 'react';
import type { DocumentPage } from './document-pages';

export interface DocumentEditorSurfaceProps {
  page: DocumentPage;
}

/**
 * Internal boundary for document-mode editors.
 *
 * Non-editor app code works with {@link DocumentPage} metadata only: selecting
 * a page, storing its title, and choosing whether that page renders in document
 * or canvas mode. The concrete editor implementation owns document-mode content
 * loading, saving, and cleanup behind this boundary so migrations stay local to
 * the editor surface.
 */
export interface DocumentEditorBoundary {
  id: string;
  Surface: ComponentType<DocumentEditorSurfaceProps>;
}
