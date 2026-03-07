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
 * or canvas mode. The concrete editor implementation projects the shared
 * page/block/entity/relation structure into a document editor surface and owns
 * renderer-specific loading, saving, and cleanup behind this boundary so
 * migrations stay local to the editor surface.
 */
export interface DocumentEditorBoundary {
  id: string;
  Surface: ComponentType<DocumentEditorSurfaceProps>;
}
