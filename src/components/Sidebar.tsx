import { useState } from 'react';
import type { Category, WorldStore } from '../lib/collection';
import {
  addCategory,
  addDocToCategory,
  getDocTitle,
  removeCategory,
  renameCategory,
} from '../lib/collection';
import {
  getCategoryIcon,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Zap,
} from '../lib/icons';
import type { ThemeId } from '../themes';
import { ThemeSwitcher } from './ThemeSwitcher';

interface SidebarProps {
  store: WorldStore;
  activeDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onStoreChange: () => void;
  currentTheme: ThemeId;
  onThemeSwitch: (next: ThemeId) => void;
}

export function Sidebar({
  store,
  activeDocId,
  onSelectDoc,
  onStoreChange,
  currentTheme,
  onThemeSwitch,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(store.categories.map((c) => c.id)),
  );
  // Adding a document to an existing category
  const [addingDocTo, setAddingDocTo] = useState<string | null>(null);
  const [newDocTitle, setNewDocTitle] = useState('');
  // Inline rename of a category
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingLabel, setRenamingLabel] = useState('');
  // Creating a new category
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  function toggleCategory(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Document creation ──────────────────────────────────────────

  function startAddingDoc(categoryId: string) {
    setAddingDocTo(categoryId);
    setNewDocTitle('');
  }

  function commitAddDoc(categoryId: string) {
    const title = newDocTitle.trim();
    if (title) {
      const docId = addDocToCategory(store, categoryId, title);
      onStoreChange();
      onSelectDoc(docId);
    }
    setAddingDocTo(null);
    setNewDocTitle('');
  }

  function handleAddDocKeyDown(e: React.KeyboardEvent, categoryId: string) {
    if (e.key === 'Enter') commitAddDoc(categoryId);
    if (e.key === 'Escape') { setAddingDocTo(null); setNewDocTitle(''); }
  }

  // ── Category rename ────────────────────────────────────────────

  function startRenaming(categoryId: string, currentLabel: string) {
    setRenamingId(categoryId);
    setRenamingLabel(currentLabel);
  }

  function commitRename(categoryId: string) {
    const trimmed = renamingLabel.trim();
    if (trimmed) {
      try {
        renameCategory(store, categoryId, trimmed);
        onStoreChange();
      } catch (err) {
        // Close the input first so the alert doesn't leave a dangling input behind,
        // then notify the user. The original label is preserved.
        setRenamingId(null);
        setRenamingLabel('');
        alert(err instanceof Error ? err.message : String(err));
        return;
      }
    }
    setRenamingId(null);
    setRenamingLabel('');
  }

  function handleRenameKeyDown(e: React.KeyboardEvent, categoryId: string) {
    if (e.key === 'Enter') commitRename(categoryId);
    if (e.key === 'Escape') { setRenamingId(null); setRenamingLabel(''); }
  }

  // ── Category delete ────────────────────────────────────────────

  function handleDeleteCategory(categoryId: string) {
    const category = store.categories.find((c) => c.id === categoryId);
    if (!category) return;
    if (category.docIds.length > 0) {
      const ok = window.confirm(
        `Delete "${category.label}"?\n\n` +
        `It contains ${category.docIds.length} document(s). ` +
        `The documents will be removed from the sidebar but preserved in storage.`,
      );
      if (!ok) return;
    }
    removeCategory(store, categoryId);
    setExpanded((prev) => { const next = new Set(prev); next.delete(categoryId); return next; });
    onStoreChange();
  }

  // ── New category ───────────────────────────────────────────────

  function startAddingCategory() {
    setAddingCategory(true);
    setNewCategoryName('');
  }

  function commitAddCategory() {
    const name = newCategoryName.trim();
    if (name) {
      try {
        const category = addCategory(store, name);
        setExpanded((prev) => new Set([...prev, category.id]));
        onStoreChange();
      } catch (err) {
        // Close the input first so the alert doesn't leave a dangling input behind.
        setAddingCategory(false);
        setNewCategoryName('');
        alert(err instanceof Error ? err.message : String(err));
        return;
      }
    }
    setAddingCategory(false);
    setNewCategoryName('');
  }

  function handleNewCategoryKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitAddCategory();
    if (e.key === 'Escape') { setAddingCategory(false); setNewCategoryName(''); }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo" aria-hidden="true">
          <Zap size={18} />
        </span>
        <span className="sidebar-title">LITD</span>
        <span className="sidebar-subtitle">Worldbuilder</span>
      </div>
      <nav className="sidebar-nav">
        {store.categories.map((category: Category) => {
          const CategoryIcon = getCategoryIcon(category.id);
          const isOpen = expanded.has(category.id);
          const isRenaming = renamingId === category.id;
          return (
            <div key={category.id} className="sidebar-category">
              <div className="sidebar-category-header">
                {isRenaming ? (
                  <div className="sidebar-category-rename-row">
                    <CategoryIcon size={13} aria-hidden="true" />
                    <input
                      autoFocus
                      className="sidebar-category-rename-input"
                      value={renamingLabel}
                      onChange={(e) => setRenamingLabel(e.target.value)}
                      onKeyDown={(e) => handleRenameKeyDown(e, category.id)}
                      onBlur={() => commitRename(category.id)}
                      aria-label="Rename category"
                    />
                  </div>
                ) : (
                  <button
                    className="sidebar-category-toggle"
                    onClick={() => toggleCategory(category.id)}
                    onDoubleClick={() => startRenaming(category.id, category.label)}
                    aria-expanded={isOpen}
                  >
                    <CategoryIcon size={13} aria-hidden="true" />
                    <span className="sidebar-category-label">{category.label}</span>
                    <ChevronRight
                      size={12}
                      className={`sidebar-category-chevron ${isOpen ? 'open' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                )}
                {!isRenaming && (
                  <div className="sidebar-category-actions">
                    <button
                      className="sidebar-category-action-btn"
                      onClick={() => startRenaming(category.id, category.label)}
                      title="Rename category"
                      aria-label={`Rename ${category.label}`}
                    >
                      <Pencil size={11} aria-hidden="true" />
                    </button>
                    <button
                      className="sidebar-category-action-btn danger"
                      onClick={() => handleDeleteCategory(category.id)}
                      title="Delete category"
                      aria-label={`Delete ${category.label}`}
                    >
                      <Trash2 size={11} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
              {isOpen && (
                <ul className="sidebar-doc-list">
                  {category.docIds.map((docId) => (
                    <li key={docId}>
                      <button
                        className={`sidebar-doc-item ${activeDocId === docId ? 'active' : ''}`}
                        onClick={() => onSelectDoc(docId)}
                         title={getDocTitle(store, docId)}
                      >
                        <FileText size={11} aria-hidden="true" />
                        <span className="sidebar-doc-title">
                           {getDocTitle(store, docId)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {addingDocTo === category.id ? (
                    <li className="sidebar-new-doc-input">
                      <input
                        autoFocus
                        className="sidebar-input"
                        placeholder="Document title…"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        onKeyDown={(e) => handleAddDocKeyDown(e, category.id)}
                        onBlur={() => commitAddDoc(category.id)}
                      />
                    </li>
                  ) : (
                    <li>
                      <button
                        className="sidebar-add-btn"
                        onClick={() => startAddingDoc(category.id)}
                        title={`Add to ${category.label}`}
                      >
                        <Plus size={11} aria-hidden="true" />
                        New {category.newLabel}
                      </button>
                    </li>
                  )}
                </ul>
              )}
            </div>
          );
        })}
        {addingCategory ? (
          <div className="sidebar-new-category-input-row">
            <input
              autoFocus
              className="sidebar-input"
              placeholder="Category name…"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={handleNewCategoryKeyDown}
              onBlur={commitAddCategory}
            />
          </div>
        ) : (
          <button
            className="sidebar-new-category-btn"
            onClick={startAddingCategory}
            title="Add a new category"
          >
            <Plus size={11} aria-hidden="true" />
            New Category
          </button>
        )}
      </nav>
      <ThemeSwitcher currentTheme={currentTheme} onSwitch={onThemeSwitch} />
    </aside>
  );
}
