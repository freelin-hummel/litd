import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Category, WorkspaceMetadata, WorldStore } from '../lib/collection';
import {
  addCategory,
  removeCategory,
  renameCategory,
  updateWorkspaceMetadata,
} from '../lib/collection';
import { createPageInCategory, listCategoryPages } from '../lib/pages';
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
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onStoreChange: () => void;
  currentTheme: ThemeId;
  onThemeSwitch: (next: ThemeId) => void;
}

type SidebarDialogState =
  | { kind: 'delete'; categoryId: string; label: string; pageCount: number }
  | { kind: 'error'; title: string; description: string }
  | null;

interface WorkspaceDraft {
  title: string;
  subtitle: string;
  documentLabel: string;
  documentSidebarMeta: string;
  documentBadgeLabel: string;
  canvasLabel: string;
  canvasSidebarMeta: string;
  canvasBadgeLabel: string;
}

function createWorkspaceDraft(workspace: WorkspaceMetadata): WorkspaceDraft {
  return {
    title: workspace.title,
    subtitle: workspace.subtitle,
    documentLabel: workspace.modes.document.label,
    documentSidebarMeta: workspace.modes.document.sidebarMeta,
    documentBadgeLabel: workspace.modes.document.badgeLabel,
    canvasLabel: workspace.modes.canvas.label,
    canvasSidebarMeta: workspace.modes.canvas.sidebarMeta,
    canvasBadgeLabel: workspace.modes.canvas.badgeLabel,
  };
}

export function Sidebar({
  store,
  activePageId,
  onSelectPage,
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
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] = useState<WorkspaceDraft>(
    () => createWorkspaceDraft(store.workspace),
  );
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
    setEditingWorkspace(false);
  }

  function commitAddDoc(categoryId: string) {
    const title = newDocTitle.trim();
    if (title) {
      const pageId = createPageInCategory(store, categoryId, title);
      onStoreChange();
      onSelectPage(pageId);
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
    setEditingWorkspace(false);
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
        openErrorDialog('Unable to rename collection', error);
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
      pageCount: category.docIds.length,
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
    setEditingWorkspace(false);
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
        openErrorDialog('Unable to create collection', error);
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

  function startEditingWorkspace() {
    setWorkspaceDraft(createWorkspaceDraft(store.workspace));
    setEditingWorkspace(true);
    setAddingCategory(false);
    setAddingDocTo(null);
    setRenamingId(null);
  }

  function cancelEditingWorkspace() {
    setWorkspaceDraft(createWorkspaceDraft(store.workspace));
    setEditingWorkspace(false);
  }

  function commitWorkspaceEdit() {
    const title = workspaceDraft.title.trim();
    const documentLabel = workspaceDraft.documentLabel.trim();
    const canvasLabel = workspaceDraft.canvasLabel.trim();
    const subtitle = workspaceDraft.subtitle.trim();
    const documentSidebarMeta = workspaceDraft.documentSidebarMeta.trim();
    const documentBadgeLabel = workspaceDraft.documentBadgeLabel.trim();
    const canvasSidebarMeta = workspaceDraft.canvasSidebarMeta.trim();
    const canvasBadgeLabel = workspaceDraft.canvasBadgeLabel.trim();

    if (!title || !documentLabel || !canvasLabel) {
      openErrorDialog(
        'Unable to update workspace branding',
        'Title, document label, and canvas label cannot be empty.',
      );
      return;
    }

    // Subtitle is optional; blank badges/meta labels are normalized back to
    // defaults so branding can be simplified without leaving empty UI labels.
    updateWorkspaceMetadata(store, {
      title,
      subtitle,
      modes: {
        document: {
          description: store.workspace.modes.document.description,
          label: documentLabel,
          sidebarMeta: documentSidebarMeta,
          badgeLabel: documentBadgeLabel,
        },
        canvas: {
          description: store.workspace.modes.canvas.description,
          label: canvasLabel,
          sidebarMeta: canvasSidebarMeta,
          badgeLabel: canvasBadgeLabel,
        },
      },
    });
    setEditingWorkspace(false);
    onStoreChange();
  }

  function handleWorkspaceEditorKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') commitWorkspaceEdit();
    if (event.key === 'Escape') cancelEditingWorkspace();
  }

  const activeDialogTitle =
    dialogState?.kind === 'delete' ? `Delete “${dialogState.label}”?` : dialogState?.title ?? '';
  const activeDialogDescription =
    dialogState?.kind === 'delete'
      ? dialogState.pageCount > 0
        ? `This collection contains ${dialogState.pageCount} page(s). The sidebar grouping will be removed, but the underlying pages remain stored locally.`
        : 'This collection will be removed from the sidebar.'
      : dialogState?.description ?? '';

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-branding">
            <span className="sidebar-logo" aria-hidden="true">
              <Zap size={18} />
            </span>
            <span className="sidebar-title">{store.workspace.title}</span>
            {store.workspace.subtitle ? (
              <span className="sidebar-subtitle">{store.workspace.subtitle}</span>
            ) : null}
          </div>
          <IconButton
            className="sidebar-header-action-btn"
            variant="ghost"
            size="sm"
            label="Edit workspace branding"
            onClick={() => {
              if (editingWorkspace) {
                cancelEditingWorkspace();
                return;
              }
              startEditingWorkspace();
            }}
          >
            <Pencil size={11} aria-hidden="true" />
          </IconButton>
        </div>
        {editingWorkspace ? (
          <div className="sidebar-workspace-editor">
            <div className="sidebar-workspace-field">
              <span className="sidebar-workspace-field-label">Title</span>
              <Input
                className="sidebar-input"
                value={workspaceDraft.title}
                onChange={(event) =>
                  setWorkspaceDraft((prev) => ({ ...prev, title: event.target.value }))
                }
                onKeyDown={handleWorkspaceEditorKeyDown}
                aria-label="Workspace title"
              />
            </div>
            <div className="sidebar-workspace-field">
              <span className="sidebar-workspace-field-label">Subtitle</span>
              <Input
                className="sidebar-input"
                value={workspaceDraft.subtitle}
                onChange={(event) =>
                  setWorkspaceDraft((prev) => ({ ...prev, subtitle: event.target.value }))
                }
                onKeyDown={handleWorkspaceEditorKeyDown}
                aria-label="Workspace subtitle"
              />
            </div>
            <div className="sidebar-workspace-grid">
              <div className="sidebar-workspace-field">
                <span className="sidebar-workspace-field-label">Document label</span>
                <Input
                  className="sidebar-input"
                  value={workspaceDraft.documentLabel}
                  onChange={(event) =>
                    setWorkspaceDraft((prev) => ({
                      ...prev,
                      documentLabel: event.target.value,
                    }))
                  }
                  onKeyDown={handleWorkspaceEditorKeyDown}
                  aria-label="Document mode label"
                />
              </div>
              <div className="sidebar-workspace-field">
                <span className="sidebar-workspace-field-label">Document sidebar badge</span>
                <Input
                  className="sidebar-input"
                  value={workspaceDraft.documentSidebarMeta}
                  onChange={(event) =>
                    setWorkspaceDraft((prev) => ({
                      ...prev,
                      documentSidebarMeta: event.target.value,
                    }))
                  }
                  onKeyDown={handleWorkspaceEditorKeyDown}
                  aria-label="Document sidebar badge"
                />
              </div>
              <div className="sidebar-workspace-field">
                <span className="sidebar-workspace-field-label">Document header badge</span>
                <Input
                  className="sidebar-input"
                  value={workspaceDraft.documentBadgeLabel}
                  onChange={(event) =>
                    setWorkspaceDraft((prev) => ({
                      ...prev,
                      documentBadgeLabel: event.target.value,
                    }))
                  }
                  onKeyDown={handleWorkspaceEditorKeyDown}
                  aria-label="Document header badge"
                />
              </div>
              <div className="sidebar-workspace-field">
                <span className="sidebar-workspace-field-label">Canvas label</span>
                <Input
                  className="sidebar-input"
                  value={workspaceDraft.canvasLabel}
                  onChange={(event) =>
                    setWorkspaceDraft((prev) => ({ ...prev, canvasLabel: event.target.value }))
                  }
                  onKeyDown={handleWorkspaceEditorKeyDown}
                  aria-label="Canvas mode label"
                />
              </div>
              <div className="sidebar-workspace-field">
                <span className="sidebar-workspace-field-label">Canvas badge</span>
                <Input
                  className="sidebar-input"
                  value={workspaceDraft.canvasSidebarMeta}
                  onChange={(event) =>
                    setWorkspaceDraft((prev) => ({
                      ...prev,
                      canvasSidebarMeta: event.target.value,
                    }))
                  }
                  onKeyDown={handleWorkspaceEditorKeyDown}
                  aria-label="Canvas sidebar badge"
                />
              </div>
              <div className="sidebar-workspace-field sidebar-workspace-field--full">
                <span className="sidebar-workspace-field-label">Canvas header badge</span>
                <Input
                  className="sidebar-input"
                  value={workspaceDraft.canvasBadgeLabel}
                  onChange={(event) =>
                    setWorkspaceDraft((prev) => ({
                      ...prev,
                      canvasBadgeLabel: event.target.value,
                    }))
                  }
                  onKeyDown={handleWorkspaceEditorKeyDown}
                  aria-label="Canvas header badge"
                />
              </div>
            </div>
            <div className="sidebar-workspace-actions">
              <Button variant="ghost" size="sm" onClick={cancelEditingWorkspace}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" onClick={commitWorkspaceEdit}>
                Save branding
              </Button>
            </div>
          </div>
        ) : null}
        <nav className="sidebar-nav">
          {store.categories.map((category: Category) => {
            const CategoryIcon = getCategoryIcon(category.metadata.icon);
            const isOpen = expanded.has(category.id);
            const isRenaming = renamingId === category.id;
            const pages = listCategoryPages(store, category);

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
                        aria-label="Rename collection"
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
                            label={`Collection actions for ${category.label}`}
                          >
                            <Pencil size={11} aria-hidden="true" />
                          </IconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => startRenaming(category.id, category.label)}>
                            <Pencil size={12} aria-hidden="true" />
                            Rename collection
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem danger onSelect={() => requestDeleteCategory(category.id)}>
                            <Trash2 size={12} aria-hidden="true" />
                            Delete collection
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                <CollapsibleContent>
                  <ul className="sidebar-doc-list">
                    {pages.map((page) => (
                      <li key={page.id}>
                        <Button
                          className={`sidebar-doc-item ${activePageId === page.id ? 'active' : ''}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectPage(page.id)}
                          title={`${page.title} · ${page.sidebarMeta}`}
                        >
                          <FileText size={11} aria-hidden="true" />
                          <span className="sidebar-doc-content">
                            <span className="sidebar-doc-title">{page.title}</span>
                            <span className="sidebar-doc-meta">{page.sidebarMeta}</span>
                          </span>
                        </Button>
                      </li>
                    ))}
                    {addingDocTo === category.id ? (
                      <li className="sidebar-new-doc-input">
                        <Input
                          autoFocus
                          className="sidebar-input"
                          placeholder="Page title…"
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
                          title={`Add a page to ${category.label}`}
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
                placeholder="Collection name…"
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
              title="Add a new collection"
            >
              <Plus size={11} aria-hidden="true" />
              New Collection
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
        actionLabel={dialogState?.kind === 'delete' ? 'Delete collection' : 'OK'}
        cancelLabel={dialogState?.kind === 'delete' ? 'Keep collection' : 'Dismiss'}
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
