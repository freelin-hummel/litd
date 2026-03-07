import { HEADING, ORDERED_LIST, QUOTE, TEXT_FORMAT_TRANSFORMERS, UNORDERED_LIST } from '@lexical/markdown';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
  REMOVE_LIST_COMMAND,
  $isListItemNode,
  $isListNode,
} from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingNode,
  QuoteNode,
  type HeadingTagType,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  type LexicalEditor,
} from 'lexical';
import {
  Bold,
  ChevronDown,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { DefaultQuickActions, Tldraw } from 'tldraw';
import type { ThemeId } from '../themes';
import { getThemeMeta } from '../themes';
import {
  loadDocumentEditorState,
  saveDocumentEditorState,
  releaseCollaborationDoc,
} from '../lib/collection';
import type { WorldDoc } from '../lib/collection';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  IconButton,
} from '../primitives';

interface EditorProps {
  doc: WorldDoc | null;
  theme: ThemeId;
}

interface CanvasMountedEditor {
  user: {
    updateUserPreferences: (preferences: { colorScheme: 'light' | 'dark' }) => void;
  };
}

type BlockType = 'paragraph' | HeadingTagType | 'quote' | 'ul' | 'ol';

type TextFormat = 'bold' | 'italic' | 'underline' | 'strikethrough';

const DOCUMENT_PLACEHOLDER = 'Start writing your world-building notes…';

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  paragraph: 'Paragraph',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  quote: 'Quote',
  ul: 'Bullet list',
  ol: 'Numbered list',
};

const BLOCK_TYPE_OPTIONS: BlockType[] = ['paragraph', 'h1', 'h2', 'h3', 'quote', 'ul', 'ol'];

const MARKDOWN_TRANSFORMERS = [HEADING, QUOTE, ORDERED_LIST, UNORDERED_LIST, ...TEXT_FORMAT_TRANSFORMERS];

function DocumentPlaceholder() {
  return <div className="editor-document-placeholder">{DOCUMENT_PLACEHOLDER}</div>;
}

function getBlockTypeFromEditor(editor: LexicalEditor): BlockType {
  return editor.getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return 'paragraph';

    const anchorNode = selection.anchor.getNode();
    let element =
      anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();

    if ($isListItemNode(element)) {
      const parentList = element.getParent();
      if ($isListNode(parentList)) {
        element = parentList;
      }
    }

    if ($isListNode(element)) {
      return element.getListType() === 'number' ? 'ol' : 'ul';
    }

    if ($isHeadingNode(element)) {
      return element.getTag();
    }

    return element.getType() === 'quote' ? 'quote' : 'paragraph';
  });
}

function applyBlockType(editor: LexicalEditor, nextBlockType: BlockType) {
  if (nextBlockType === 'ul') {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    return;
  }

  if (nextBlockType === 'ol') {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    return;
  }

  if (getBlockTypeFromEditor(editor) === 'ul' || getBlockTypeFromEditor(editor) === 'ol') {
    editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
  }

  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    if (nextBlockType === 'paragraph') {
      $setBlocksType(selection, () => $createParagraphNode());
      return;
    }

    if (nextBlockType === 'quote') {
      $setBlocksType(selection, () => $createQuoteNode());
      return;
    }

    $setBlocksType(selection, () => $createHeadingNode(nextBlockType));
  });
}

function DocumentPersistencePlugin({
  docId,
  initialSerializedState,
}: {
  docId: string;
  initialSerializedState: string | null;
}) {
  const lastSavedStateRef = useRef(initialSerializedState ?? '');

  return (
    <OnChangePlugin
      ignoreSelectionChange={true}
      onChange={(editorState) => {
        const serializedState = JSON.stringify(editorState.toJSON());
        if (serializedState === lastSavedStateRef.current) return;

        lastSavedStateRef.current = serializedState;
        void saveDocumentEditorState(docId, serializedState);
      }}
    />
  );
}

function DocumentToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [blockType, setBlockType] = useState<BlockType>('paragraph');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Record<TextFormat, boolean>>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
  });

  const syncToolbarState = useCallback(() => {
    setBlockType(getBlockTypeFromEditor(editor));

    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        setActiveFormats({
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
        });
        return;
      }

      setActiveFormats({
        bold: selection.hasFormat('bold'),
        italic: selection.hasFormat('italic'),
        underline: selection.hasFormat('underline'),
        strikethrough: selection.hasFormat('strikethrough'),
      });
    });
  }, [editor]);

  useEffect(() => {
    syncToolbarState();

    const unregisterUpdate = editor.registerUpdateListener(() => {
      syncToolbarState();
    });
    const unregisterSelection = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        syncToolbarState();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    const unregisterCanUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    const unregisterCanRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      unregisterUpdate();
      unregisterSelection();
      unregisterCanUndo();
      unregisterCanRedo();
    };
  }, [editor, syncToolbarState]);

  const keepSelection = useCallback((event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="editor-document-chrome">
      <div className="editor-document-toolbar" role="toolbar" aria-label="Document formatting">
        <div className="editor-document-toolbar-group">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="editor-document-block-trigger"
                variant="outline"
                size="sm"
                onMouseDown={keepSelection}
                aria-label="Choose block style"
              >
                {BLOCK_TYPE_LABELS[blockType]}
                <ChevronDown size={14} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={blockType}
                onValueChange={(value) => {
                  if (
                    value === 'paragraph' ||
                    value === 'quote' ||
                    value === 'ul' ||
                    value === 'ol' ||
                    value === 'h1' ||
                    value === 'h2' ||
                    value === 'h3'
                  ) {
                    applyBlockType(editor, value);
                  }
                }}
              >
                {BLOCK_TYPE_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option} value={option} onSelect={(event) => event.preventDefault()}>
                    {BLOCK_TYPE_LABELS[option]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="editor-document-toolbar-group">
          <IconButton
            className={activeFormats.bold ? 'editor-document-toolbar-btn is-active' : 'editor-document-toolbar-btn'}
            label="Bold"
            variant="ghost"
            size="sm"
            onMouseDown={keepSelection}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
          >
            <Bold size={14} aria-hidden="true" />
          </IconButton>
          <IconButton
            className={activeFormats.italic ? 'editor-document-toolbar-btn is-active' : 'editor-document-toolbar-btn'}
            label="Italic"
            variant="ghost"
            size="sm"
            onMouseDown={keepSelection}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
          >
            <Italic size={14} aria-hidden="true" />
          </IconButton>
          <IconButton
            className={activeFormats.underline ? 'editor-document-toolbar-btn is-active' : 'editor-document-toolbar-btn'}
            label="Underline"
            variant="ghost"
            size="sm"
            onMouseDown={keepSelection}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
          >
            <Underline size={14} aria-hidden="true" />
          </IconButton>
          <IconButton
            className={activeFormats.strikethrough ? 'editor-document-toolbar-btn is-active' : 'editor-document-toolbar-btn'}
            label="Strikethrough"
            variant="ghost"
            size="sm"
            onMouseDown={keepSelection}
            onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
          >
            <Strikethrough size={14} aria-hidden="true" />
          </IconButton>
        </div>

        <div className="editor-document-toolbar-group">
          <IconButton
            className={blockType === 'ul' ? 'editor-document-toolbar-btn is-active' : 'editor-document-toolbar-btn'}
            label="Bullet list"
            variant="ghost"
            size="sm"
            onMouseDown={keepSelection}
            onClick={() => {
              editor.dispatchCommand(
                blockType === 'ul' ? REMOVE_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
                undefined,
              );
            }}
          >
            <List size={14} aria-hidden="true" />
          </IconButton>
          <IconButton
            className={blockType === 'ol' ? 'editor-document-toolbar-btn is-active' : 'editor-document-toolbar-btn'}
            label="Numbered list"
            variant="ghost"
            size="sm"
            onMouseDown={keepSelection}
            onClick={() => {
              editor.dispatchCommand(
                blockType === 'ol' ? REMOVE_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
                undefined,
              );
            }}
          >
            <ListOrdered size={14} aria-hidden="true" />
          </IconButton>
          <IconButton
            className={blockType === 'quote' ? 'editor-document-toolbar-btn is-active' : 'editor-document-toolbar-btn'}
            label="Quote"
            variant="ghost"
            size="sm"
            onMouseDown={keepSelection}
            onClick={() => applyBlockType(editor, blockType === 'quote' ? 'paragraph' : 'quote')}
          >
            <Quote size={14} aria-hidden="true" />
          </IconButton>
        </div>

        <div className="editor-document-toolbar-group editor-document-toolbar-group--spaced">
          <IconButton
            className="editor-document-toolbar-btn"
            label="Undo"
            variant="ghost"
            size="sm"
            disabled={!canUndo}
            onMouseDown={keepSelection}
            onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
          >
            <Undo2 size={14} aria-hidden="true" />
          </IconButton>
          <IconButton
            className="editor-document-toolbar-btn"
            label="Redo"
            variant="ghost"
            size="sm"
            disabled={!canRedo}
            onMouseDown={keepSelection}
            onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
          >
            <Redo2 size={14} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="editor-document-shortcuts" aria-hidden="true">
        <span><Heading1 size={13} /></span>
        <span><Heading2 size={13} /></span>
        <span><Heading3 size={13} /></span>
        <span>Markdown shortcuts enabled</span>
      </div>
    </div>
  );
}

function DocumentEditor({ doc }: { doc: WorldDoc }) {
  const [initialSerializedState, setInitialSerializedState] = useState<string | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const currentDocId = doc.id;
    return () => releaseCollaborationDoc(currentDocId);
  }, [doc.id]);

  useEffect(() => {
    let cancelled = false;

    setInitialSerializedState(undefined);
    void loadDocumentEditorState(doc.id).then((serializedState) => {
      if (!cancelled) {
        setInitialSerializedState(serializedState);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [doc.id]);

  const initialConfig = useMemo(
    () => ({
      namespace: `litd-document-${doc.id}`,
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
      onError(error: Error) {
        throw error;
      },
      editorState(editor: LexicalEditor) {
        if (!initialSerializedState) return;

        try {
          editor.setEditorState(editor.parseEditorState(initialSerializedState));
        } catch (error) {
          console.error('Failed to restore the saved document state.', error);
        }
      },
    }),
    [doc.id, initialSerializedState],
  );

  if (initialSerializedState === undefined) {
    return (
      <div className="editor-loading">
        <span>Loading document…</span>
      </div>
    );
  }

  return (
    <div className="editor-document-shell">
      <div className="editor-document-inner">
        <LexicalComposer initialConfig={initialConfig} key={doc.id}>
          <DocumentToolbarPlugin />
          <div className="editor-document-editor">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-document-content"
                  aria-label={`${doc.title} editor`}
                />
              }
              placeholder={<DocumentPlaceholder />}
              ErrorBoundary={LexicalErrorBoundary}
            />
          </div>
          <HistoryPlugin />
          <ListPlugin />
          <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
          <DocumentPersistencePlugin
            docId={doc.id}
            initialSerializedState={initialSerializedState}
          />
        </LexicalComposer>
      </div>
    </div>
  );
}

const TLDRAW_COMPONENTS = {
  MainMenu: null,
  QuickActions: DefaultQuickActions,
} as const;

function CanvasEditor({ doc, theme }: { doc: WorldDoc; theme: ThemeId }) {
  const colorScheme = getThemeMeta(theme).appearance;
  const editorRef = useRef<CanvasMountedEditor | null>(null);

  const syncColorScheme = useCallback((editor: CanvasMountedEditor) => {
    editor.user.updateUserPreferences({ colorScheme });
  }, [colorScheme]);

  useEffect(() => {
    if (editorRef.current) {
      syncColorScheme(editorRef.current);
    }
  }, [syncColorScheme]);

  return (
    <div className="editor-canvas-shell">
      <div className="editor-canvas-badge">Canvas mode</div>
      <Tldraw
        persistenceKey={`litd:tldraw:${doc.id}`}
        components={TLDRAW_COMPONENTS}
        onMount={(editor) => {
          editorRef.current = editor as CanvasMountedEditor;
          syncColorScheme(editor as CanvasMountedEditor);
        }}
      />
    </div>
  );
}

export function Editor({ doc, theme }: EditorProps) {
  if (!doc) {
    return (
      <div className="editor-empty">
        <div className="editor-empty-content">
          <span className="editor-empty-icon" aria-hidden="true">
            <Zap size={48} strokeWidth={1.5} />
          </span>
          <h2>Select a document to begin</h2>
          <p>Choose an entry from the sidebar, or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-host">
      {doc.mode === 'canvas' ? <CanvasEditor doc={doc} theme={theme} /> : <DocumentEditor doc={doc} />}
    </div>
  );
}
