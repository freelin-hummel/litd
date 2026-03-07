import type { Provider, ProviderAwareness, UserState } from '@lexical/yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';

export interface DocumentPage {
  markdown: string;
  updatedAt: string | null;
}

export interface CollaborationSession {
  doc: Y.Doc;
  persistence: IndexeddbPersistence;
  provider: Provider;
}

type ProviderStatus = { status: string };
type SyncListener = (isSynced: boolean) => void;
type StatusListener = (status: ProviderStatus) => void;
type UpdateListener = (arg: unknown) => void;
type ReloadListener = (doc: Y.Doc) => void;
type ProviderEventName = 'sync' | 'status' | 'update' | 'reload';

function emitAll<T>(listeners: Set<(payload: T) => void>, payload: T): void {
  for (const listener of listeners) {
    listener(payload);
  }
}

class LocalAwareness implements ProviderAwareness {
  private localState: UserState | null = null;

  private readonly listeners = new Set<() => void>();

  getLocalState(): UserState | null {
    return this.localState;
  }

  getStates(): Map<number, UserState> {
    return this.localState ? new Map([[0, this.localState]]) : new Map();
  }

  on(type: 'update', cb: () => void): void {
    if (type === 'update') {
      this.listeners.add(cb);
    }
  }

  off(type: 'update', cb: () => void): void {
    if (type === 'update') {
      this.listeners.delete(cb);
    }
  }

  setLocalState(state: UserState | null): void {
    this.localState = state;
    emitAll(this.listeners, undefined);
  }

  setLocalStateField(field: string, value: unknown): void {
    this.localState = this.localState
      ? { ...this.localState, [field]: value }
      : ({
          anchorPos: null,
          awarenessData: {},
          color: '#6b7280',
          focusPos: null,
          focusing: false,
          name: 'Local user',
          [field]: value,
        } as UserState);
    emitAll(this.listeners, undefined);
  }
}

class LocalCollaborationProvider implements Provider {
  readonly awareness: ProviderAwareness = new LocalAwareness();

  private readonly syncListeners = new Set<SyncListener>();

  private readonly statusListeners = new Set<StatusListener>();

  private readonly updateListeners = new Set<UpdateListener>();

  private readonly reloadListeners = new Set<ReloadListener>();

  private connected = false;

  constructor(private readonly persistence: IndexeddbPersistence) {}

  connect(): Promise<void> | void {
    if (this.connected) {
      this.emitStatus('connected');
      this.emitSync(true);
      return;
    }

    this.connected = true;
    this.emitStatus('connected');

    if ((this.persistence as { synced?: boolean }).synced) {
      this.emitSync(true);
      return;
    }

    return (this.persistence as { whenSynced?: Promise<unknown> }).whenSynced?.then(() => {
      if (this.connected) {
        this.emitSync(true);
      }
    });
  }

  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    this.emitStatus('disconnected');
  }

  on(type: ProviderEventName, cb: SyncListener | StatusListener | UpdateListener | ReloadListener): void {
    if (type === 'sync') {
      this.syncListeners.add(cb as SyncListener);
      return;
    }
    if (type === 'status') {
      this.statusListeners.add(cb as StatusListener);
      return;
    }
    if (type === 'update') {
      this.updateListeners.add(cb as UpdateListener);
      return;
    }
    this.reloadListeners.add(cb as ReloadListener);
  }

  off(type: ProviderEventName, cb: SyncListener | StatusListener | UpdateListener | ReloadListener): void {
    if (type === 'sync') {
      this.syncListeners.delete(cb as SyncListener);
      return;
    }
    if (type === 'status') {
      this.statusListeners.delete(cb as StatusListener);
      return;
    }
    if (type === 'update') {
      this.updateListeners.delete(cb as UpdateListener);
      return;
    }
    this.reloadListeners.delete(cb as ReloadListener);
  }

  private emitSync(isSynced: boolean): void {
    emitAll(this.syncListeners, isSynced);
  }

  private emitStatus(status: string): void {
    emitAll(this.statusListeners, { status });
  }
}

export function createDocumentPage(markdown = ''): DocumentPage {
  return {
    markdown,
    updatedAt: markdown ? new Date().toISOString() : null,
  };
}

export function normalizeDocumentPage(value: unknown): DocumentPage {
  if (value === null || typeof value !== 'object') {
    return createDocumentPage();
  }

  const record = value as Record<string, unknown>;
  return {
    markdown: typeof record.markdown === 'string' ? record.markdown : '',
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : null,
  };
}

export function createCollaborationSession(docId: string): CollaborationSession {
  const doc = new Y.Doc();
  const persistence = new IndexeddbPersistence(`litd:lexical:${docId}`, doc);
  const provider = new LocalCollaborationProvider(persistence);

  return { doc, persistence, provider };
}

export function destroyCollaborationSession(session: CollaborationSession): void {
  session.provider.disconnect();
  session.persistence.destroy();
  session.doc.destroy();
}
