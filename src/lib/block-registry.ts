import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { TRANSFORMERS, type Transformer } from '@lexical/markdown';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import type { Klass, LexicalNode } from 'lexical';

/**
 * Lightweight descriptive schema for shared block metadata. Values are
 * human-readable field descriptors today so renderers/importers can expose and
 * persist block metadata consistently before a stricter validation layer exists.
 */
export type BlockMetadataSchema = Record<string, string>;

export interface BlockTypeRegistration {
  type: string;
  label: string;
  description: string;
  lexicalNodes: ReadonlyArray<Klass<LexicalNode>>;
  markdown: {
    import: 'native' | 'lossy' | 'unsupported';
    export: 'native' | 'lossy' | 'unsupported';
  };
  canvas: {
    projection: 'card' | 'inline' | 'hidden';
  };
  metadataSchema: BlockMetadataSchema;
  supportsMechanics: boolean;
}

const CORE_LEXICAL_NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode] as const;

export const CORE_BLOCK_REGISTRY: readonly BlockTypeRegistration[] = [
  {
    type: 'paragraph',
    label: 'Paragraph',
    description: 'Default rich-text block rendered natively in Lexical and projected as inline text.',
    lexicalNodes: [],
    markdown: { import: 'native', export: 'native' },
    canvas: { projection: 'inline' },
    metadataSchema: { tags: 'string[]', pinned: 'boolean', assetRefs: 'AssetReference[]' },
    supportsMechanics: false,
  },
  {
    type: 'heading',
    label: 'Heading',
    description: 'Section heading block with native markdown compatibility.',
    lexicalNodes: [HeadingNode],
    markdown: { import: 'native', export: 'native' },
    canvas: { projection: 'card' },
    metadataSchema: { level: 'number', pinned: 'boolean' },
    supportsMechanics: false,
  },
  {
    type: 'quote',
    label: 'Quote',
    description: 'Quoted text block that can render in document and canvas projections.',
    lexicalNodes: [QuoteNode],
    markdown: { import: 'native', export: 'native' },
    canvas: { projection: 'card' },
    metadataSchema: { attribution: 'string', pinned: 'boolean' },
    supportsMechanics: false,
  },
  {
    type: 'list',
    label: 'List',
    description: 'Ordered or unordered list block with native markdown compatibility.',
    lexicalNodes: [ListNode, ListItemNode],
    markdown: { import: 'native', export: 'native' },
    canvas: { projection: 'card' },
    metadataSchema: { listType: 'bullet | number | check' },
    supportsMechanics: false,
  },
  {
    type: 'code',
    label: 'Code',
    description: 'Structured code block that preserves markdown fenced-block behavior.',
    lexicalNodes: [CodeNode],
    markdown: { import: 'native', export: 'native' },
    canvas: { projection: 'card' },
    metadataSchema: { language: 'string' },
    supportsMechanics: false,
  },
  {
    type: 'reference',
    label: 'Reference',
    description: 'Inline reference/link block that can point to pages, entities, or assets.',
    lexicalNodes: [LinkNode],
    markdown: { import: 'native', export: 'lossy' },
    canvas: { projection: 'card' },
    metadataSchema: { href: 'string', targetId: 'string', assetRefs: 'AssetReference[]' },
    supportsMechanics: false,
  },
];

export function getRegisteredBlockTypes(
  registry: readonly BlockTypeRegistration[] = CORE_BLOCK_REGISTRY,
): Record<string, BlockTypeRegistration> {
  return Object.fromEntries(registry.map((entry) => [entry.type, entry]));
}

export function getRegisteredLexicalNodes(
  registry: readonly BlockTypeRegistration[] = CORE_BLOCK_REGISTRY,
): Array<Klass<LexicalNode>> {
  const nodes = new Map<string, Klass<LexicalNode>>();

  for (const entry of registry) {
    for (const node of entry.lexicalNodes) {
      nodes.set(node.name, node);
    }
  }

  for (const node of CORE_LEXICAL_NODES) {
    nodes.set(node.name, node);
  }

  return [...nodes.values()];
}

export function getRegisteredMarkdownTransformers(): Transformer[] {
  return [...TRANSFORMERS];
}
