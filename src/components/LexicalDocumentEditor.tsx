import { $convertFromMarkdownString } from '@lexical/markdown';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import type { LexicalEditor } from 'lexical';
import { GripVertical } from 'lucide-react';
import type { MutableRefObject } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  getRegisteredLexicalNodes,
  getRegisteredMarkdownTransformers,
} from '../lib/block-registry';
import type { DocumentPage } from '../lib/document';
import { getCollaborationSession } from '../lib/collection';

interface LexicalDocumentEditorProps {
  docId: string;
  page: DocumentPage;
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

export function LexicalDocumentEditor({
  docId,
  page,
}: LexicalDocumentEditorProps) {
  const session = useMemo(() => getCollaborationSession(docId), [docId]);
  const initialMarkdownRef = useRef(page.markdown);
  const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const targetLineRef = useRef<HTMLDivElement | null>(null);
  const registeredLexicalNodes = useMemo(() => getRegisteredLexicalNodes(), []);
  const registeredMarkdownTransformers = useMemo(() => getRegisteredMarkdownTransformers(), []);

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

  const initialEditorState = useCallback(
    (editor: LexicalEditor) => {
      // One-time legacy bootstrap from stored markdown if the collaboration doc is empty.
      if (!initialMarkdownRef.current.trim()) {
        return;
      }

      editor.update(() => {
        $convertFromMarkdownString(initialMarkdownRef.current, registeredMarkdownTransformers);
      });
    },
    [registeredMarkdownTransformers],
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
