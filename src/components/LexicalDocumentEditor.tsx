import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { GripVertical } from 'lucide-react';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getRegisteredLexicalNodes,
  getRegisteredMarkdownTransformers,
} from '../lib/block-registry';
import type { DocumentPage } from '../lib/document';
import {
  createLexicalInitialEditorState,
  syncDocumentPageFromSerializedEditorState,
} from '../lib/document-editor';
import { getCollaborationSession } from '../lib/collection';

interface LexicalDocumentEditorProps {
  docId: string;
  page: DocumentPage;
  onPageChange: (page: DocumentPage) => void;
}

function DraggableBlockMenu({ menuRef }: { menuRef: MutableRefObject<HTMLDivElement | null> }) {
  return (
    <div ref={(node) => { menuRef.current = node; }} className="editor-document-drag-menu" aria-hidden="true">
      <span className="editor-document-drag-handle">
        <GripVertical size={14} strokeWidth={1.8} />
      </span>
    </div>
  );
}

function DraggableBlockTargetLine({ targetLineRef }: { targetLineRef: MutableRefObject<HTMLDivElement | null> }) {
  return <div ref={(node) => { targetLineRef.current = node; }} className="editor-document-drag-target-line" aria-hidden="true" />;
}

function PageModelSyncPlugin({
  page,
  onPageChange,
}: {
  page: DocumentPage;
  onPageChange: (page: DocumentPage) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const pageRef = useRef(page);
  const signatureRef = useRef('');

  useEffect(() => {
    pageRef.current = page;
    const initialEditorState = createLexicalInitialEditorState(page);
    signatureRef.current = initialEditorState ? JSON.stringify(initialEditorState) : '';
  }, [page]);

  useEffect(
    () =>
      editor.registerUpdateListener(({ editorState }) => {
        const nextPage = syncDocumentPageFromSerializedEditorState(pageRef.current, editorState.toJSON());
        const nextInitialEditorState = createLexicalInitialEditorState(nextPage);
        const nextSignature = nextInitialEditorState ? JSON.stringify(nextInitialEditorState) : '';

        if (nextSignature === signatureRef.current) {
          return;
        }

        signatureRef.current = nextSignature;
        pageRef.current = nextPage;
        onPageChange(nextPage);
      }),
    [editor, onPageChange],
  );

  return null;
}

export function LexicalDocumentEditor({
  docId,
  page,
  onPageChange,
}: LexicalDocumentEditorProps) {
  const session = useMemo(() => getCollaborationSession(docId), [docId]);
  const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const targetLineRef = useRef<HTMLDivElement | null>(null);
  const registeredLexicalNodes = useMemo(() => getRegisteredLexicalNodes(), []);
  const registeredMarkdownTransformers = useMemo(() => getRegisteredMarkdownTransformers(), []);
  const initialEditorState = useMemo(() => {
    const serializedEditorState = createLexicalInitialEditorState(page);
    return serializedEditorState ? JSON.stringify(serializedEditorState) : undefined;
  }, [page]);

  const initialConfig = useMemo<InitialConfigType>(
    () => ({
      editorState: null,
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
    [docId],
  );

  return (
    <div className="editor-document-shell">
      <div className="editor-document-inner" ref={setAnchorElem}>
        <LexicalComposer initialConfig={initialConfig}>
          <LexicalCollaboration>
            <CollaborationPlugin
              id={docId}
              providerFactory={(id, yjsDocMap) => {
                yjsDocMap.set(id, session.doc);
                return session.provider;
              }}
              shouldBootstrap
              initialEditorState={initialEditorState}
            />
            <RichTextPlugin
              contentEditable={<ContentEditable className="editor-document-content" />}
              placeholder={null}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <MarkdownShortcutPlugin transformers={registeredMarkdownTransformers} />
            <PageModelSyncPlugin page={page} onPageChange={onPageChange} />
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
          </LexicalCollaboration>
        </LexicalComposer>
      </div>
    </div>
  );
}
