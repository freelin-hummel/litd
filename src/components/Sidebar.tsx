import { useState } from 'react';
import type { Category, CategoryId, WorldStore } from '../lib/collection';
import { addDocToCategory, getDocTitle } from '../lib/collection';

interface SidebarProps {
  store: WorldStore;
  activeDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onStoreChange: () => void;
}

export function Sidebar({ store, activeDocId, onSelectDoc, onStoreChange }: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<CategoryId>>(
    new Set(['worlds', 'locations', 'factions', 'characters', 'lore', 'bestiary']),
  );
  const [adding, setAdding] = useState<CategoryId | null>(null);
  const [newTitle, setNewTitle] = useState('');

  function toggleCategory(id: CategoryId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function startAdding(categoryId: CategoryId) {
    setAdding(categoryId);
    setNewTitle('');
  }

  function commitAdd(categoryId: CategoryId) {
    const title = newTitle.trim();
    if (title) {
      const docId = addDocToCategory(store, categoryId, title);
      onStoreChange();
      onSelectDoc(docId);
    }
    setAdding(null);
    setNewTitle('');
  }

  function handleAddKeyDown(e: React.KeyboardEvent, categoryId: CategoryId) {
    if (e.key === 'Enter') commitAdd(categoryId);
    if (e.key === 'Escape') {
      setAdding(null);
      setNewTitle('');
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">⚔️</span>
        <span className="sidebar-title">LITD</span>
        <span className="sidebar-subtitle">Worldbuilder</span>
      </div>
      <nav className="sidebar-nav">
        {store.categories.map((category: Category) => (
          <div key={category.id} className="sidebar-category">
            <button
              className="sidebar-category-header"
              onClick={() => toggleCategory(category.id)}
              aria-expanded={expanded.has(category.id)}
            >
              <span className="sidebar-category-icon">{category.icon}</span>
              <span className="sidebar-category-label">{category.label}</span>
              <span className="sidebar-category-chevron">
                {expanded.has(category.id) ? '▾' : '▸'}
              </span>
            </button>
            {expanded.has(category.id) && (
              <ul className="sidebar-doc-list">
                {category.docIds.map((docId) => (
                  <li key={docId}>
                    <button
                      className={`sidebar-doc-item ${activeDocId === docId ? 'active' : ''}`}
                      onClick={() => onSelectDoc(docId)}
                      title={getDocTitle(store.collection, docId)}
                    >
                      <span className="sidebar-doc-icon">📄</span>
                      <span className="sidebar-doc-title">
                        {getDocTitle(store.collection, docId)}
                      </span>
                    </button>
                  </li>
                ))}
                {adding === category.id ? (
                  <li className="sidebar-new-doc-input">
                    <input
                      autoFocus
                      className="sidebar-input"
                      placeholder="Document title…"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => handleAddKeyDown(e, category.id)}
                      onBlur={() => commitAdd(category.id)}
                    />
                  </li>
                ) : (
                  <li>
                    <button
                      className="sidebar-add-btn"
                      onClick={() => startAdding(category.id)}
                      title={`Add to ${category.label}`}
                    >
                      + New {category.newLabel}
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
