import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
import type { Provider, ProviderAwareness, UserState } from '@lexical/yjs';
import * as Y from 'yjs';
import { getCollaborationHandle } from './collection';

type ProviderStatus = { status: 'connected' | 'disconnected' };
type ProviderLocalState = ReturnType<ProviderAwareness['getLocalState']>;
type ProviderStateMap = ReturnType<ProviderAwareness['getStates']>;
type ProviderListenerMap = {
  reload: (doc: Y.Doc) => void;
  status: (status: ProviderStatus) => void;
  sync: (isSynced: boolean) => void;
  update: (payload: unknown) => void;
};

type CollaborationMessage =
  | { type: 'awareness-update'; source: number; update: Uint8Array }
  | { type: 'doc-update'; source: number; update: Uint8Array }
  | { type: 'sync-request'; source: number }
  | { type: 'sync-response'; source: number; state: Uint8Array; awareness?: Uint8Array };

const channelName = (docId: string) => `litd:collab:${docId}`;

class LocalLexicalProvider implements Provider {
  readonly awareness: ProviderAwareness;

  private readonly awarenessInstance: Awareness;

  private readonly listeners: {
    [K in keyof ProviderListenerMap]: Set<ProviderListenerMap[K]>;
  } = {
    reload: new Set(),
    status: new Set(),
    sync: new Set(),
    update: new Set(),
  };

  private channel: BroadcastChannel | null = null;
  private connected = false;

  private normalizeUserState(state: Record<string, unknown> | null): UserState | null {
    if (state === null) return null;

    return {
      anchorPos: null,
      color: '',
      focusing: false,
      focusPos: null,
      name: '',
      awarenessData: {},
      ...state,
    };
  }

  /**
   * @param docId Collaboration room/document identifier used for broadcast scoping.
   * @param doc Shared Yjs document instance reused from the app's collaboration cache.
   * @param whenSynced Resolves once IndexedDB persistence has applied stored updates into the doc.
   */
  constructor(
    private readonly docId: string,
    private readonly doc: Y.Doc,
    private readonly whenSynced: Promise<unknown>,
  ) {
    this.awarenessInstance = new Awareness(doc);
    this.awareness = {
      getLocalState: (): ProviderLocalState =>
        this.normalizeUserState(this.awarenessInstance.getLocalState()),
      getStates: (): ProviderStateMap =>
        new Map(
          Array.from(this.awarenessInstance.getStates(), ([clientId, state]) => [
            clientId,
            this.normalizeUserState(state as Record<string, unknown>) as UserState,
          ]),
        ),
      off: (type, cb) => {
        this.awarenessInstance.off(type, cb);
      },
      on: (type, cb) => {
        this.awarenessInstance.on(type, cb);
      },
      setLocalState: (state) => {
        this.awarenessInstance.setLocalState(state);
      },
      setLocalStateField: (field, value) => {
        this.awarenessInstance.setLocalStateField(field, value);
      },
    };
  }

  connect(): void {
    if (this.connected) return;

    this.connected = true;
    this.doc.on('update', this.handleDocUpdate);
    this.awarenessInstance.on('update', this.handleAwarenessUpdate);

    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(channelName(this.docId));
      this.channel.addEventListener('message', this.handleMessage as EventListener);
      this.channel.postMessage({ type: 'sync-request', source: this.doc.clientID } satisfies CollaborationMessage);
    }

    this.emit('status', { status: 'connected' });
    void this.whenSynced.then(() => {
      if (!this.connected) return;
      this.emit('sync', true);
    });
  }

  disconnect(): void {
    if (!this.connected) return;

    this.awareness.setLocalState(null);

    this.connected = false;
    this.doc.off('update', this.handleDocUpdate);
    this.awarenessInstance.off('update', this.handleAwarenessUpdate);

    if (this.channel) {
      this.channel.removeEventListener('message', this.handleMessage as EventListener);
      this.channel.close();
      this.channel = null;
    }

    this.emit('sync', false);
    this.emit('status', { status: 'disconnected' });
  }

  on<T extends keyof ProviderListenerMap>(type: T, cb: ProviderListenerMap[T]): void {
    this.listeners[type].add(cb);
  }

  off<T extends keyof ProviderListenerMap>(type: T, cb: ProviderListenerMap[T]): void {
    this.listeners[type].delete(cb);
  }

  private emit<T extends keyof ProviderListenerMap>(
    type: T,
    payload: Parameters<ProviderListenerMap[T]>[0],
  ): void {
    for (const listener of this.listeners[type]) {
      (listener as (value: Parameters<ProviderListenerMap[T]>[0]) => void)(payload);
    }
  }

  private readonly handleDocUpdate = (update: Uint8Array, origin: unknown): void => {
    if (!this.connected || origin === this) return;
    this.channel?.postMessage({
      type: 'doc-update',
      source: this.doc.clientID,
      update,
    } satisfies CollaborationMessage);
    this.emit('update', update);
  };

  private readonly handleAwarenessUpdate = ({
    added,
    updated,
    removed,
  }: {
    added: number[];
    updated: number[];
    removed: number[];
  }): void => {
    if (!this.connected) return;

    const changedClients = [...added, ...updated, ...removed];
    if (changedClients.length === 0) return;

    this.channel?.postMessage({
      type: 'awareness-update',
      source: this.doc.clientID,
      update: encodeAwarenessUpdate(this.awarenessInstance, changedClients),
    } satisfies CollaborationMessage);
  };

  private readonly handleMessage = (event: MessageEvent<CollaborationMessage>): void => {
    const message = event.data;
    if (message.source === this.doc.clientID) return;

    switch (message.type) {
      case 'doc-update':
        Y.applyUpdate(this.doc, message.update, this);
        this.emit('update', message.update);
        break;
      case 'awareness-update':
        applyAwarenessUpdate(this.awarenessInstance, message.update, this);
        break;
      case 'sync-request':
        this.channel?.postMessage({
          type: 'sync-response',
          source: this.doc.clientID,
          state: Y.encodeStateAsUpdate(this.doc),
          awareness: encodeAwarenessUpdate(
            this.awarenessInstance,
            Array.from(this.awareness.getStates().keys()),
          ),
        } satisfies CollaborationMessage);
        break;
      case 'sync-response':
        Y.applyUpdate(this.doc, message.state, this);
        if (message.awareness) {
          applyAwarenessUpdate(this.awarenessInstance, message.awareness, this);
        }
        this.emit('sync', true);
        break;
    }
  };
}

/**
 * Creates the Lexical provider for a document and ensures the shared Yjs doc is
 * registered in Lexical's yjsDocMap for the lifetime of that editor instance.
 * The corresponding doc teardown remains the caller's responsibility via
 * releaseCollaborationDoc(docId) when the editor unmounts or switches pages.
 *
 * @param id Collaboration room/document identifier.
 * @param yjsDocMap Lexical's per-editor Yjs doc registry used by CollaborationPlugin.
 */
export function createLexicalCollaborationProvider(id: string, yjsDocMap: Map<string, Y.Doc>): Provider {
  const { doc, persistence } = getCollaborationHandle(id);
  yjsDocMap.set(id, doc);
  return new LocalLexicalProvider(id, doc, persistence.whenSynced);
}
