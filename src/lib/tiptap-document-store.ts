import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

const yDocCache = new Map<string, Y.Doc>();
const yPersistenceCache = new Map<string, IndexeddbPersistence>();

export function getTipTapDocument(pageId: string): Y.Doc {
  const cached = yDocCache.get(pageId);
  if (cached) return cached;

  const yDoc = new Y.Doc();
  yDocCache.set(pageId, yDoc);
  yPersistenceCache.set(pageId, new IndexeddbPersistence(`litd:page-document:${pageId}`, yDoc));
  return yDoc;
}

export function releaseTipTapDocument(pageId: string): void {
  yPersistenceCache.get(pageId)?.destroy();
  yPersistenceCache.delete(pageId);
  yDocCache.get(pageId)?.destroy();
  yDocCache.delete(pageId);
}
