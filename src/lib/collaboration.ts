import * as Y from 'yjs';
import type { DocumentPage } from './document';
import type { CollaborationSession } from './document';
import { logSyncDebug } from './sync-debug';

export type DocumentSyncStatus =
  | 'connecting'
  | 'syncing'
  | 'synced'
  | 'offline'
  | 'reconnecting'
  | 'error';

export interface RoomSeedMetadata {
  seeded: boolean;
  seedVersion: number;
  seededAt: string | null;
  source: 'canonical' | 'empty';
}

export interface RoomSeedResolution {
  shouldBootstrap: boolean;
  reason: 'remote-state' | 'canonical-seed' | 'empty-room' | 'seeded-room';
}

const ROOM_ROOT_NAME = 'root';
const ROOM_METADATA_NAME = 'litd:sync';
export const ROOM_SEED_VERSION = 1;

function getRoomRoot(doc: Y.Doc): Y.XmlText {
  return doc.get(ROOM_ROOT_NAME, Y.XmlText);
}

function getRoomMetadataMap(doc: Y.Doc): Y.Map<unknown> {
  return doc.getMap(ROOM_METADATA_NAME);
}

export function hasCollaborativeContent(doc: Y.Doc): boolean {
  return getRoomRoot(doc).length > 0;
}

export function readRoomSeedMetadata(doc: Y.Doc): RoomSeedMetadata | null {
  const metadata = getRoomMetadataMap(doc);
  const seeded = metadata.get('seeded');
  if (seeded !== true) {
    return null;
  }

  const seedVersion = metadata.get('seedVersion');
  const seededAt = metadata.get('seededAt');
  const source = metadata.get('source');

  return {
    seeded: true,
    seedVersion: typeof seedVersion === 'number' ? seedVersion : ROOM_SEED_VERSION,
    seededAt: typeof seededAt === 'string' ? seededAt : null,
    source: source === 'empty' ? 'empty' : 'canonical',
  };
}

export function markRoomSeeded(
  doc: Y.Doc,
  source: RoomSeedMetadata['source'],
): RoomSeedMetadata {
  const metadata = getRoomMetadataMap(doc);
  const nextMetadata: RoomSeedMetadata = {
    seeded: true,
    seedVersion: ROOM_SEED_VERSION,
    seededAt: new Date().toISOString(),
    source,
  };

  metadata.set('seeded', true);
  metadata.set('seedVersion', nextMetadata.seedVersion);
  metadata.set('seededAt', nextMetadata.seededAt);
  metadata.set('source', nextMetadata.source);
  logSyncDebug('collaboration', 'room seeded', { ...nextMetadata });
  return nextMetadata;
}

export function resolveRoomSeedResolution(
  doc: Y.Doc,
  page: DocumentPage,
): RoomSeedResolution {
  if (hasCollaborativeContent(doc)) {
    return { shouldBootstrap: false, reason: 'remote-state' };
  }

  if (readRoomSeedMetadata(doc)?.seeded) {
    return { shouldBootstrap: false, reason: 'seeded-room' };
  }

  if (page.model.rootBlockIds.length > 0) {
    return { shouldBootstrap: true, reason: 'canonical-seed' };
  }

  return { shouldBootstrap: false, reason: 'empty-room' };
}

export function createLexicalProviderFactory(session: CollaborationSession) {
  return (id: string, yjsDocMap: Map<string, Y.Doc>) => {
    yjsDocMap.set(id, session.doc);
    return session.provider;
  };
}

function browserOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export function deriveSyncStatusFromProviderStatus(
  previousStatus: DocumentSyncStatus,
  providerStatus: string,
): DocumentSyncStatus {
  if (providerStatus === 'connected') {
    return previousStatus === 'synced' ? 'synced' : 'syncing';
  }

  if (providerStatus === 'connecting') {
    return previousStatus === 'synced' ? 'reconnecting' : 'connecting';
  }

  if (providerStatus === 'disconnected') {
    return browserOnline() ? 'reconnecting' : 'offline';
  }

  if (providerStatus === 'error') {
    return 'error';
  }

  return previousStatus;
}

export function getCollaborationParticipantCount(session: CollaborationSession | null): number {
  if (!session) {
    return 0;
  }

  return session.provider.awareness.getStates().size;
}
