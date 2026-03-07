import {
  createPageContentModel,
  normalizePageContentModel,
  type DocumentPage as PageMetadata,
  type PageContentModel,
} from './document-pages';
import type { Provider, ProviderAwareness, UserState } from '@lexical/yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

export interface DocumentPage {
  model: PageContentModel;
}

interface DocumentPageOptions extends PageMetadata {
  categoryIds?: string[];
  sortIndex?: number | null;
}

export interface CollaborationSession {
  doc: Y.Doc;
  persistence: IndexeddbPersistence;
  provider: ManagedProvider;
}

type ProviderStatus = { status: string };
type SyncListener = (isSynced: boolean) => void;
type StatusListener = (status: ProviderStatus) => void;
type UpdateListener = (arg: unknown) => void;
type ReloadListener = (doc: Y.Doc) => void;
type ProviderEventName = 'sync' | 'status' | 'update' | 'reload';

interface ManagedProvider extends Provider {
  destroy(): void;
}

class HocuspocusAwarenessAdapter implements ProviderAwareness {
  constructor(private readonly awareness: NonNullable<HocuspocusProvider['awareness']>) {}

  getLocalState(): UserState | null {
    return this.awareness.getLocalState() as UserState | null;
  }

  getStates(): Map<number, UserState> {
    return this.awareness.getStates() as Map<number, UserState>;
  }

  on(type: 'update', cb: () => void): void {
    this.awareness.on(type, cb);
  }

  off(type: 'update', cb: () => void): void {
    this.awareness.off(type, cb);
  }

  setLocalState(state: UserState | null): void {
    this.awareness.setLocalState(state);
  }

  setLocalStateField(field: string, value: unknown): void {
    this.awareness.setLocalStateField(field, value);
  }
}

class HocuspocusLexicalProviderAdapter implements ManagedProvider {
  readonly awareness: ProviderAwareness;

  constructor(private readonly provider: HocuspocusProvider) {
    if (!provider.awareness) {
      throw new Error('Hocuspocus provider must expose awareness for Lexical collaboration.');
    }

    this.awareness = new HocuspocusAwarenessAdapter(provider.awareness);
  }

  connect(): void | Promise<void> {
    return Promise.resolve(this.provider.connect()).then(() => undefined);
  }

  disconnect(): void {
    this.provider.disconnect();
  }

  on(type: ProviderEventName, cb: SyncListener | StatusListener | UpdateListener | ReloadListener): void {
    this.provider.on(type, cb as never);
  }

  off(type: ProviderEventName, cb: SyncListener | StatusListener | UpdateListener | ReloadListener): void {
    this.provider.off(type, cb as never);
  }

  destroy(): void {
    this.provider.destroy();
  }
}

const DEFAULT_HOCUSPOCUS_URL = 'ws://127.0.0.1:1234';

function getHocuspocusUrl(): string {
  const configured = import.meta.env.VITE_HOCUSPOCUS_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_HOCUSPOCUS_URL;
}

function getHocuspocusToken(): string | null {
  const configured = import.meta.env.VITE_HOCUSPOCUS_TOKEN?.trim();
  return configured && configured.length > 0 ? configured : null;
}

export function createDocumentPage(
  { id, title, mode, categoryIds = [], sortIndex = null }: DocumentPageOptions,
): DocumentPage {
  return {
    model: createPageContentModel(
      { id, title, mode },
      { categoryIds, sortIndex },
    ),
  };
}

export function normalizeDocumentPage(
  value: unknown,
  { id, title, mode, categoryIds = [], sortIndex = null }: DocumentPageOptions,
): DocumentPage {
  if (value === null || typeof value !== 'object') {
    return createDocumentPage({ id, title, mode, categoryIds, sortIndex });
  }

  const record = value as Record<string, unknown>;
  return {
    model: normalizePageContentModel(
      record.model,
      { id, title, mode },
      { categoryIds, sortIndex },
    ),
  };
}

export function createCollaborationSession(docId: string): CollaborationSession {
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`litd:lexical:${docId}`, doc);
  const provider = new HocuspocusLexicalProviderAdapter(new HocuspocusProvider({
    url: getHocuspocusUrl(),
    name: docId,
    document: doc,
    token: getHocuspocusToken(),
  }));

  return { doc, persistence, provider };
}

export function destroyCollaborationSession(session: CollaborationSession): void {
  session.provider.disconnect();
  session.provider.destroy();
  session.persistence.destroy();
  session.doc.destroy();
}
