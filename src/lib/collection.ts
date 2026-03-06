import { AffineSchemas } from '@blocksuite/blocks/schemas';
import { createDefaultDoc } from '@blocksuite/affine-shared/utils';
import { DocCollection, Schema } from '@blocksuite/store';

export type CategoryId =
  | 'worlds'
  | 'locations'
  | 'factions'
  | 'characters'
  | 'lore'
  | 'bestiary';

export interface Category {
  id: CategoryId;
  label: string;
  /** Singular label used in "New <X>" button text */
  newLabel: string;
  icon: string;
  docIds: string[];
}

export interface WorldStore {
  collection: DocCollection;
  categories: Category[];
}

const INITIAL_DOCS: Record<CategoryId, { title: string }[]> = {
  worlds: [{ title: 'Aethermoor — Campaign Overview' }],
  locations: [
    { title: 'The Shattered Citadel' },
    { title: 'Duskwood Forest' },
  ],
  factions: [
    { title: 'The Iron Compact' },
    { title: 'Sisterhood of the Silver Flame' },
  ],
  characters: [{ title: 'Voryn Ashcloak (BBEG)' }, { title: 'Lira the Wayfarer (PC)' }],
  lore: [{ title: 'The Sundering War' }],
  bestiary: [{ title: 'Voidwyrm' }],
};

export function initWorldStore(): WorldStore {
  const schema = new Schema().register(AffineSchemas);
  const collection = new DocCollection({ schema });
  collection.meta.initialize();

  const categories: Category[] = [
    { id: 'worlds',     label: 'Worlds',        newLabel: 'World',      icon: '🌍', docIds: [] },
    { id: 'locations',  label: 'Locations',     newLabel: 'Location',   icon: '📍', docIds: [] },
    { id: 'factions',   label: 'Factions',      newLabel: 'Faction',    icon: '⚔️',  docIds: [] },
    { id: 'characters', label: 'Characters',    newLabel: 'Character',  icon: '👤', docIds: [] },
    { id: 'lore',       label: 'Lore & History',newLabel: 'Lore Entry', icon: '📜', docIds: [] },
    { id: 'bestiary',   label: 'Bestiary',      newLabel: 'Entry',      icon: '🐉', docIds: [] },
  ];

  for (const category of categories) {
    const defs = INITIAL_DOCS[category.id] ?? [];
    for (const def of defs) {
      const doc = createDefaultDoc(collection, { title: def.title });
      category.docIds.push(doc.id);
    }
  }

  return { collection, categories };
}

export function addDocToCategory(
  store: WorldStore,
  categoryId: CategoryId,
  title: string,
): string {
  const doc = createDefaultDoc(store.collection, { title });
  const category = store.categories.find((c) => c.id === categoryId);
  if (category) {
    category.docIds.push(doc.id);
  }
  return doc.id;
}

export function getDocTitle(collection: DocCollection, docId: string): string {
  const meta = collection.meta.getDocMeta(docId);
  return meta?.title ?? 'Untitled';
}
