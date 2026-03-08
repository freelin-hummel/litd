import type { SerializedLexicalNode } from 'lexical';

const BLOCK_ID_FIELD = '__litdBlockId';
const LEGACY_LEXICAL_BLOCK_ID_PREFIX = 'lexical-block:';
let fallbackBlockIdSequence = 0;

type SerializedLexicalNodeRecord = SerializedLexicalNode & {
  type: string;
  [BLOCK_ID_FIELD]?: unknown;
};

function cloneLexicalNode<T extends SerializedLexicalNode>(node: T): T {
  return JSON.parse(JSON.stringify(node)) as T;
}

function createFallbackBlockId(): string {
  fallbackBlockIdSequence += 1;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    const randomHex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    return `block-${randomHex}`;
  }

  return `block-${Date.now().toString(36)}-${fallbackBlockIdSequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createStableBlockId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `block-${crypto.randomUUID()}`;
  }

  return createFallbackBlockId();
}

export function isLegacyPositionalBlockId(blockId: string): boolean {
  return blockId.startsWith(LEGACY_LEXICAL_BLOCK_ID_PREFIX);
}

export function getSerializedLexicalNodeBlockId(
  node: SerializedLexicalNode & { type: string },
): string | null {
  const blockId = (node as SerializedLexicalNodeRecord)[BLOCK_ID_FIELD];
  return typeof blockId === 'string' && blockId.trim() ? blockId : null;
}

export function withSerializedLexicalNodeBlockId(
  node: SerializedLexicalNode & { type: string },
  blockId: string,
): SerializedLexicalNode {
  const stampedNode: SerializedLexicalNodeRecord = {
    ...(cloneLexicalNode(node) as SerializedLexicalNodeRecord),
    [BLOCK_ID_FIELD]: blockId,
  };

  return stampedNode as SerializedLexicalNode;
}

export function createLexicalNodeFingerprint(
  node: SerializedLexicalNode & { type: string },
): string {
  const clonedNode = cloneLexicalNode(node) as SerializedLexicalNodeRecord;
  delete clonedNode[BLOCK_ID_FIELD];
  return JSON.stringify(clonedNode);
}
