import { useState } from 'react';
import type { KeyboardEvent } from 'react';
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
import {
  AppAlertDialog,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
} from '../primitives';
import { ThemeSwitcher } from './ThemeSwitcher';

interface SidebarProps {
  store: WorldStore;
  activeDocId: string | null;
  onSelectDoc: (docId: string) => void;
  onStoreChange: () => void;
  currentTheme: ThemeId;
  onThemeSwitch: (next: ThemeId) => void;
}

type SidebarDialogState =
  | { kind: 'delete'; categoryId: string; label: string; docCount: number }
  | { kind: 'error'; title: string; description: string }
  | null;

export function Sidebar({
  store,
  activeDocId,
  onSelectDoc,
  onStoreChange,
  currentTheme,
  onThemeSwitch,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(store.categories.map((category) => category.id)),
  );
  const [addingDocTo, setAddingDocTo] = useState<string | null>(null);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingLabel, setRenamingLabel] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [dialogState, setDialogState] = useState<SidebarDialogState>(null);

  function toggleCategory(id: string, open: boolean) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function openErrorDialog(title: string, error: unknown) {
    setDialogState({
      kind: 'error',
      title,
      description: error instanceof Error ? error.message : String(error),
    });
  }

  function startAddingDoc(categoryId: string) {
    setAddingDocTo(categoryId);
    setNewDocTitle('');
    setRenamingId(null);
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

  function handleAddDocKeyDown(event: KeyboardEvent<HTMLInputElement>, categoryId: string) {
    if (event.key === 'Enter') commitAddDoc(categoryId);
    if (event.key === 'Escape') {
      setAddingDocTo(null);
      setNewDocTitle('');
    }
  }

  function startRenaming(categoryId: string, currentLabel: string) {
    setRenamingId(categoryId);
    setRenamingLabel(currentLabel);
    setAddingDocTo(null);
  }

  function commitRename(categoryId: string) {
    const trimmed = renamingLabel.trim();
    if (trimmed) {
      try {
        renameCategory(store, categoryId, trimmed);
        onStoreChange();
      } catch (error) {
        setRenamingId(null);
        setRenamingLabel('');
        openErrorDialog('Unable to rename category', error);
        return;
      }
    }
    setRenamingId(null);
    setRenamingLabel('');
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>, categoryId: string) {
    if (event.key === 'Enter') commitRename(categoryId);
    if (event.key === 'Escape') {
      setRenamingId(null);
      setRenamingLabel('');
    }
  }

  function requestDeleteCategory(categoryId: string) {
    const category = store.categories.find((entry) => entry.id === categoryId);
    if (!category) return;

    setDialogState({
      kind: 'delete',
      categoryId,
      label: category.label,
      docCount: category.docIds.length,
    });
  }

  function confirmDeleteCategory() {
    if (!dialogState || dialogState.kind !== 'delete') return;
    removeCategory(store, dialogState.categoryId);
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(dialogState.categoryId);
      return next;
    });
    setDialogState(null);
    onStoreChange();
  }

  function startAddingCategory() {
    setAddingCategory(true);
    setNewCategoryName('');
    setAddingDocTo(null);
    setRenamingId(null);
  }

  function commitAddCategory() {
    const name = newCategoryName.trim();
    if (name) {
      try {
        const category = addCategory(store, name);
        setExpanded((prev) => new Set([...prev, category.id]));
        onStoreChange();
      } catch (error) {
        setAddingCategory(false);
        setNewCategoryName('');
        openErrorDialog('Unable to create category', error);
        return;
      }
    }
    setAddingCategory(false);
    setNewCategoryName('');
  }

  function handleNewCategoryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') commitAddCategory();
    if (event.key === 'Escape') {
      setAddingCategory(false);
      setNewCategoryName('');
    }
  }

  const activeDialogTitle =
    dialogState?.kind === 'delete' ? `Delete “${dialogState.label}”?` : dialogState?.title ?? '';
  const activeDialogDescription =
    dialogState?.kind === 'delete'
      ? dialogState.docCount > 0
        ? `This category contains ${dialogState.docCount} document(s). The sidebar grouping will be removed, but the underlying documents remain stored locally.`
        : 'This category will be removed from the sidebar.'
      : dialogState?.description ?? '';

  return (
    <>
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
              <Collapsible
                key={category.id}
                className="sidebar-category"
                open={isOpen}
                onOpenChange={(open) => toggleCategory(category.id, open)}
              >
                <div className="sidebar-category-header">
                  {isRenaming ? (
                    <div className="sidebar-category-rename-row">
                      <CategoryIcon size={13} aria-hidden="true" />
                      <Input
                        autoFocus
                        className="sidebar-category-rename-input"
                        value={renamingLabel}
                        onChange={(event) => setRenamingLabel(event.target.value)}
                        onKeyDown={(event) => handleRenameKeyDown(event, category.id)}
                        onBlur={() => commitRename(category.id)}
                        aria-label="Rename category"
                      />
                    </div>
                  ) : (
                    <CollapsibleTrigger asChild>
                      <Button
                        className="sidebar-category-toggle"
                        variant="ghost"
                        size="sm"
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
                      </Button>
                    </CollapsibleTrigger>
                  )}
                  {!isRenaming && (
                    <div className="sidebar-category-actions">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <IconButton
                            className="sidebar-category-action-btn"
                            variant="ghost"
                            size="sm"
                            label={`Category actions for ${category.label}`}
                          >
                            <Pencil size={11} aria-hidden="true" />
                          </IconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => startRenaming(category.id, category.label)}>
                            <Pencil size={12} aria-hidden="true" />
                            Rename category
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem danger onSelect={() => requestDeleteCategory(category.id)}>
                            <Trash2 size={12} aria-hidden="true" />
                            Delete category
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                <CollapsibleContent>
                  <ul className="sidebar-doc-list">
                    {category.docIds.map((docId) => (
                      <li key={docId}>
                        <Button
                          className={`sidebar-doc-item ${activeDocId === docId ? 'active' : ''}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectDoc(docId)}
                          title={getDocTitle(store, docId)}
                        >
                          <FileText size={11} aria-hidden="true" />
                          <span className="sidebar-doc-title">{getDocTitle(store, docId)}</span>
                        </Button>
                      </li>
                    ))}
                    {addingDocTo === category.id ? (
                      <li className="sidebar-new-doc-input">
                        <Input
                          autoFocus
                          className="sidebar-input"
                          placeholder="Document title…"
                          value={newDocTitle}
                          onChange={(event) => setNewDocTitle(event.target.value)}
                          onKeyDown={(event) => handleAddDocKeyDown(event, category.id)}
                          onBlur={() => commitAddDoc(category.id)}
                        />
                      </li>
                    ) : (
                      <li>
                        <Button
                          className="sidebar-add-btn"
                          variant="ghost"
                          size="sm"
                          onClick={() => startAddingDoc(category.id)}
                          title={`Add to ${category.label}`}
                        >
                          <Plus size={11} aria-hidden="true" />
                          New {category.newLabel}
                        </Button>
                      </li>
                    )}
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
          {addingCategory ? (
            <div className="sidebar-new-category-input-row">
              <Input
                autoFocus
                className="sidebar-input"
                placeholder="Category name…"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={handleNewCategoryKeyDown}
                onBlur={commitAddCategory}
              />
            </div>
          ) : (
            <Button
              className="sidebar-new-category-btn"
              variant="outline"
              size="sm"
              onClick={startAddingCategory}
              title="Add a new category"
            >
              <Plus size={11} aria-hidden="true" />
              New Category
            </Button>
          )}
        </nav>
        <ThemeSwitcher currentTheme={currentTheme} onSwitch={onThemeSwitch} />
      </aside>
      <AppAlertDialog
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        title={activeDialogTitle}
        description={activeDialogDescription}
        actionLabel={dialogState?.kind === 'delete' ? 'Delete category' : 'OK'}
        cancelLabel={dialogState?.kind === 'delete' ? 'Keep category' : 'Dismiss'}
        onAction={() => {
          if (dialogState?.kind === 'delete') {
            confirmDeleteCategory();
            return;
          }
          setDialogState(null);
        }}
        tone={dialogState?.kind === 'delete' ? 'danger' : 'default'}
      />
    </>
  );
}
