import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { createDocumentPage } from './document';
import {
  deriveSyncStatusFromProviderStatus,
  hasCollaborativeContent,
  markRoomSeeded,
  readRoomSeedMetadata,
  resolveRoomSeedResolution,
} from './collaboration';

describe('collaboration seeding rules', () => {
  it('seeds an empty room exactly once from canonical content', () => {
    const doc = new Y.Doc();
    const page = createDocumentPage({
      id: 'doc-1',
      title: 'Shared',
      mode: 'document',
    });
    page.model.rootBlockIds = ['block-1'];
    page.model.blocks['block-1'] = {
      id: 'block-1',
      type: 'paragraph',
      props: {},
      childIds: [],
      entityIds: [],
      metadata: {
        tags: [],
        pinned: false,
        customFields: {},
        assetRefs: [],
        mechanics: {},
      },
    };

    expect(resolveRoomSeedResolution(doc, page)).toEqual({
      shouldBootstrap: true,
      reason: 'canonical-seed',
    });

    const seeded = markRoomSeeded(doc, 'canonical');
    expect(seeded.seeded).toBe(true);
    expect(readRoomSeedMetadata(doc)?.source).toBe('canonical');
    expect(resolveRoomSeedResolution(doc, page)).toEqual({
      shouldBootstrap: false,
      reason: 'seeded-room',
    });
  });

  it('does not reseed a populated room', () => {
    const doc = new Y.Doc();
    doc.get('root', Y.XmlText).insert(0, 'remote');
    const page = createDocumentPage({
      id: 'doc-2',
      title: 'Remote',
      mode: 'document',
    });

    expect(hasCollaborativeContent(doc)).toBe(true);
    expect(resolveRoomSeedResolution(doc, page)).toEqual({
      shouldBootstrap: false,
      reason: 'remote-state',
    });
  });
});

describe('collaboration status mapping', () => {
  it('maps provider states into user-facing sync states', () => {
    expect(deriveSyncStatusFromProviderStatus('connecting', 'connecting')).toBe('connecting');
    expect(deriveSyncStatusFromProviderStatus('connecting', 'connected')).toBe('syncing');
    expect(deriveSyncStatusFromProviderStatus('synced', 'connected')).toBe('synced');
    expect(deriveSyncStatusFromProviderStatus('synced', 'error')).toBe('error');
  });

  it('treats disconnects as offline when the browser reports offline mode', () => {
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: false },
    });
    try {
      expect(deriveSyncStatusFromProviderStatus('synced', 'disconnected')).toBe('offline');
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: originalNavigator,
      });
    }
  });
});
