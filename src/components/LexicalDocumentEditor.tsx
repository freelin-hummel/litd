import { $createCodeNode } from '@lexical/code';
import {
  $toggleLink,
  createLinkMatcherWithRegExp,
} from '@lexical/link';
import {
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from '@lexical/list';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  type TextNode,
} from 'lexical';
import { Code2, GripVertical, Link as LinkIcon, List as ListIcon, ListChecks, ListOrdered, Quote, TextCursorInput, Type } from 'lucide-react';
import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  createLexicalProviderFactory,
  deriveSyncStatusFromProviderStatus,
  getCollaborationParticipantCount,
  markRoomSeeded,
  readRoomSeedMetadata,
  resolveRoomSeedResolution,
  type DocumentSyncStatus,
} from '../lib/collaboration';
import {
  getCollaborationSession,
  releaseCollaborationSession,
} from '../lib/collection';
import {
  getRegisteredLexicalNodes,
  getRegisteredMarkdownTransformers,
} from '../lib/block-registry';
import type { DocumentPage } from '../lib/document';
import {
  createLexicalInitialEditorState,
  syncDocumentPageFromSerializedEditorState,
} from '../lib/document-editor';
import { logSyncDebug } from '../lib/sync-debug';

const URL_MATCHERS = [
  createLinkMatcherWithRegExp(
    /https?:\/\/(?:www\.)?[^\s/$.?#].[^\s]*/,
    (text) => text,
  ),
  createLinkMatcherWithRegExp(
    /(?:www\.)[^\s/$.?#].[^\s]*/,
    (text) => `https://${text}`,
  ),
];

class SlashCommandOption extends MenuOption {
  constructor(
    public readonly title: string,
    public readonly keywords: string[],
    public readonly icon: typeof Type,
    public readonly run: (editor: ReturnType<typeof useLexicalComposerContext>[0], queryNode: TextNode | null) => void,
  ) {
    super(title);
  }
}

interface LexicalDocumentEditorProps {
  docId: string;
  page: DocumentPage;
  onPageChange: (page: DocumentPage) => void;
}

function DraggableBlockMenu({ menuRef }: { menuRef: MutableRefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={(node) => {
        menuRef.current = node;
      }}
      className="editor-document-drag-menu"
      aria-hidden="true"
    >
      <span className="editor-document-drag-handle">
        <GripVertical size={14} strokeWidth={1.8} />
      </span>
    </div>
  );
}

function DraggableBlockTargetLine({
  targetLineRef,
}: {
  targetLineRef: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={(node) => {
        targetLineRef.current = node;
      }}
      className="editor-document-drag-target-line"
      aria-hidden="true"
    />
  );
}

function clearSlashQuery(textNodeContainingQuery: TextNode | null): void {
  if (!textNodeContainingQuery) {
    return;
  }

  textNodeContainingQuery.setTextContent('');
}

function createSlashCommandOptions(
): SlashCommandOption[] {
  return [
    new SlashCommandOption('Text', ['paragraph', 'text', 'p'], TextCursorInput, (_editor, queryNode) => {
      clearSlashQuery(queryNode);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        anchorNode.getTopLevelElementOrThrow().replace($createParagraphNode()).selectEnd();
      }
    }),
    new SlashCommandOption('Heading 1', ['h1', 'heading', 'title'], Type, (_editor, queryNode) => {
      clearSlashQuery(queryNode);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.anchor.getNode().getTopLevelElementOrThrow().replace($createHeadingNode('h1')).selectEnd();
      }
    }),
    new SlashCommandOption('Heading 2', ['h2', 'heading', 'section'], Type, (_editor, queryNode) => {
      clearSlashQuery(queryNode);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.anchor.getNode().getTopLevelElementOrThrow().replace($createHeadingNode('h2')).selectEnd();
      }
    }),
    new SlashCommandOption('Quote', ['quote', 'blockquote'], Quote, (_editor, queryNode) => {
      clearSlashQuery(queryNode);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.anchor.getNode().getTopLevelElementOrThrow().replace($createQuoteNode()).selectEnd();
      }
    }),
    new SlashCommandOption('Bullet List', ['list', 'bullet', 'ul'], ListIcon, (activeEditor, queryNode) => {
      clearSlashQuery(queryNode);
      activeEditor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }),
    new SlashCommandOption('Numbered List', ['list', 'number', 'ol'], ListOrdered, (activeEditor, queryNode) => {
      clearSlashQuery(queryNode);
      activeEditor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }),
    new SlashCommandOption('Checklist', ['list', 'check', 'todo', 'task'], ListChecks, (activeEditor, queryNode) => {
      clearSlashQuery(queryNode);
      activeEditor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
    }),
    new SlashCommandOption('Code Block', ['code', 'pre'], Code2, (_editor, queryNode) => {
      clearSlashQuery(queryNode);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.anchor.getNode().getTopLevelElementOrThrow().replace($createCodeNode()).selectStart();
      }
    }),
    new SlashCommandOption('Link', ['link', 'url'], LinkIcon, (_editor, queryNode) => {
      clearSlashQuery(queryNode);
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $toggleLink('https://');
      }
    }),
  ];
}

function SlashCommandsPlugin() {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
    maxLength: 32,
  });

  const options = useMemo(() => createSlashCommandOptions(), []);
  const filteredOptions = useMemo(() => {
    const query = queryString?.trim().toLowerCase() ?? '';
    if (!query) {
      return options;
    }

    return options.filter((option) => {
      const haystack = [option.title, ...option.keywords].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [options, queryString]);

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={(selectedOption, textNodeContainingQuery, closeMenu) => {
        editor.update(() => {
          selectedOption.run(editor, textNodeContainingQuery);
        });
        closeMenu();
      }}
      options={filteredOptions}
      triggerFn={checkForSlashTriggerMatch}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (!anchorElementRef.current || filteredOptions.length === 0) {
          return null;
        }

        return createPortal(
          <div className="editor-slash-menu">
            {filteredOptions.map((option, index) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.key}
                  type="button"
                  className={`editor-slash-option ${selectedIndex === index ? 'active' : ''}`}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOptionAndCleanUp(option)}
                >
                  <span className="editor-slash-option-icon" aria-hidden="true">
                    <Icon size={14} />
                  </span>
                  <span className="editor-slash-option-label">{option.title}</span>
                </button>
              );
            })}
          </div>,
          anchorElementRef.current,
        );
      }}
    />
  );
}

export function LexicalDocumentEditor({
  docId,
  page,
  onPageChange,
}: LexicalDocumentEditorProps) {
  const [session, setSession] = useState<ReturnType<typeof getCollaborationSession> | null>(null);
  const [syncStatus, setSyncStatus] = useState<DocumentSyncStatus>('connecting');
  const [participantCount, setParticipantCount] = useState(0);
  const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const targetLineRef = useRef<HTMLDivElement | null>(null);
  const registeredLexicalNodes = useMemo(() => getRegisteredLexicalNodes(), []);
  const registeredMarkdownTransformers = useMemo(() => getRegisteredMarkdownTransformers(), []);
  const initialEditorState = useMemo(() => {
    const serializedEditorState = createLexicalInitialEditorState(page);
    return serializedEditorState ? JSON.stringify(serializedEditorState) : undefined;
  }, [page]);
  const seedResolution = useMemo(
    () => (session ? resolveRoomSeedResolution(session.doc, page) : null),
    [page, session],
  );
  const providerFactory = useMemo(
    () => (session ? createLexicalProviderFactory(session) : null),
    [session],
  );
  const pageRef = useRef(page);
  const signatureRef = useRef(initialEditorState ?? '');

  useEffect(() => {
    const activeSession = getCollaborationSession(docId);
    setSession(activeSession);
    setSyncStatus('connecting');
    setParticipantCount(getCollaborationParticipantCount(activeSession));
    logSyncDebug('collaboration', 'session acquired', { docId });

    return () => {
      logSyncDebug('collaboration', 'session released', { docId });
      releaseCollaborationSession(docId);
      setSession(null);
    };
  }, [docId]);

  useEffect(() => {
    pageRef.current = page;
    signatureRef.current = initialEditorState ?? '';
  }, [page, initialEditorState]);

  useEffect(() => {
    if (!session || !seedResolution) {
      return;
    }

    const handleStatus = ({ status }: { status: string }) => {
      setSyncStatus((previous) => deriveSyncStatusFromProviderStatus(previous, status));
      setParticipantCount(getCollaborationParticipantCount(session));
      logSyncDebug('collaboration', 'provider status', { docId, status });
    };
    const handleSync = (isSynced: boolean) => {
      setSyncStatus(isSynced ? 'synced' : 'syncing');
      setParticipantCount(getCollaborationParticipantCount(session));
      if (
        isSynced &&
        seedResolution.shouldBootstrap &&
        !readRoomSeedMetadata(session.doc)
      ) {
        markRoomSeeded(session.doc, 'canonical');
      }
      logSyncDebug('collaboration', 'provider sync', {
        docId,
        isSynced,
        seedReason: seedResolution.reason,
      });
    };
    const handleAwarenessUpdate = () => {
      setParticipantCount(getCollaborationParticipantCount(session));
    };
    const handleUpdate = () => {
      logSyncDebug('collaboration', 'provider update', { docId });
    };
    const handleReload = () => {
      logSyncDebug('collaboration', 'provider reload', { docId });
    };

    session.provider.on('status', handleStatus);
    session.provider.on('sync', handleSync);
    session.provider.on('update', handleUpdate);
    session.provider.on('reload', handleReload);
    session.provider.awareness.on('update', handleAwarenessUpdate);

    return () => {
      session.provider.off('status', handleStatus);
      session.provider.off('sync', handleSync);
      session.provider.off('update', handleUpdate);
      session.provider.off('reload', handleReload);
      session.provider.awareness.off('update', handleAwarenessUpdate);
    };
  }, [docId, seedResolution, session]);

  const initialConfig = useMemo<InitialConfigType>(
    () => ({
      namespace: 'litd-document-editor',
      nodes: registeredLexicalNodes,
      onError: (error: Error) => {
        const contextualError = new Error(
          `Lexical editor failed for document "${docId}": ${error.message}`,
        );
        (contextualError as Error & { cause?: Error }).cause = error;
        throw contextualError;
      },
    }),
    [docId, registeredLexicalNodes],
  );

  const handleChange = useCallback(
    (editorState: Parameters<NonNullable<React.ComponentProps<typeof OnChangePlugin>['onChange']>>[0]) => {
      const nextPage = syncDocumentPageFromSerializedEditorState(pageRef.current, editorState.toJSON());
      const nextInitialEditorState = createLexicalInitialEditorState(nextPage);
      const nextSignature = nextInitialEditorState ? JSON.stringify(nextInitialEditorState) : '';

      if (nextSignature === signatureRef.current) {
        return;
      }

      signatureRef.current = nextSignature;
      pageRef.current = nextPage;
      onPageChange(nextPage);
    },
    [onPageChange],
  );

  const handleAnchorRef = useCallback((element: HTMLDivElement | null) => {
    setAnchorElem(element);
  }, []);

  if (!session || !providerFactory || !seedResolution) {
    return <div className="editor-loading">Opening collaboration session…</div>;
  }

  const syncStatusLabel =
    syncStatus === 'connecting'
      ? 'Connecting'
      : syncStatus === 'syncing'
        ? 'Syncing'
        : syncStatus === 'synced'
          ? 'Synced'
          : syncStatus === 'offline'
            ? 'Offline cache'
            : syncStatus === 'reconnecting'
              ? 'Reconnecting'
              : 'Sync error';

  return (
    <div className="editor-document-shell">
      <div className="editor-document-status-bar">
        <span className="editor-sync-indicator" data-status={syncStatus}>
          {syncStatusLabel}
        </span>
        <span className="editor-sync-meta">
          {participantCount} collaborator{participantCount === 1 ? '' : 's'}
        </span>
      </div>
      <LexicalComposer initialConfig={initialConfig}>
        <CollaborationPlugin
          id={docId}
          providerFactory={providerFactory}
          shouldBootstrap={seedResolution.shouldBootstrap}
          initialEditorState={initialEditorState}
          awarenessData={{ docId, pageId: page.model.page.id, mode: 'document' }}
        />
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-document-content ContentEditable__root" ref={handleAnchorRef} />}
          placeholder={null}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <ClickableLinkPlugin newTab />
        <AutoLinkPlugin matchers={URL_MATCHERS} />
        <TabIndentationPlugin maxIndent={7} />
        <MarkdownShortcutPlugin transformers={registeredMarkdownTransformers} />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        <SlashCommandsPlugin />
        {anchorElem ? (
          <DraggableBlockPlugin_EXPERIMENTAL
            anchorElem={anchorElem}
            menuRef={menuRef}
            targetLineRef={targetLineRef}
            menuComponent={<DraggableBlockMenu menuRef={menuRef} />}
            targetLineComponent={<DraggableBlockTargetLine targetLineRef={targetLineRef} />}
            isOnMenu={(element) => menuRef.current?.contains(element) ?? false}
          />
        ) : null}
      </LexicalComposer>
    </div>
  );
}
