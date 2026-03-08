import type { SerializedLexicalNode } from 'lexical';

export const STABLE_BLOCK_ID_PREFIX = 'block';
export const LEGACY_POSITIONAL_BLOCK_ID_PREFIX = 'lexical-block:';

export function createStableBlockId(): string {
  return `${STABLE_BLOCK_ID_PREFIX}-${crypto.randomUUID()}`;
}

export function isLegacyPositionalBlockId(value: string): boolean {
  return value.startsWith(LEGACY_POSITIONAL_BLOCK_ID_PREFIX);
}

function normalizeLexicalNodeForIdentity(
  value: unknown,
  stripTextContent: boolean,
): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeLexicalNodeForIdentity(entry, stripTextContent));
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const normalizedEntries = Object.entries(record)
    .filter(([key]) => key !== '__key')
    .map(([key, entry]): [string, unknown] => {
      if (stripTextContent && key === 'text') {
        return [key, ''];
      }

      return [key, normalizeLexicalNodeForIdentity(entry, stripTextContent)];
    })
    .sort(([left], [right]) => left.localeCompare(right));

  return Object.fromEntries(normalizedEntries);
}

export function getLexicalNodeFingerprint(node: SerializedLexicalNode): string {
  return JSON.stringify(normalizeLexicalNodeForIdentity(node, false));
}

export function getLexicalNodeStructureFingerprint(node: SerializedLexicalNode): string {
  return JSON.stringify(normalizeLexicalNodeForIdentity(node, true));
}
