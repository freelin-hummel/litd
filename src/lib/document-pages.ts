export type PageId = string;

export type EditorMode = 'document' | 'canvas';

/**
 * App-level page metadata shared by every rendering mode.
 *
 * A page keeps the same identity, title, and sidebar membership whether it is
 * rendered as a structured document or as a canvas. Only the editor
 * implementation is allowed to decide how the page content is loaded and saved.
 */
export interface DocumentPage {
  id: PageId;
  title: string;
  mode: EditorMode;
}
