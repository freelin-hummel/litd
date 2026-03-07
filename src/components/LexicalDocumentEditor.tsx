import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { CodeNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalCollaboration } from '@lexical/react/LexicalCollaborationContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { $getRoot } from 'lexical';
import type { LexicalEditor } from 'lexical';
import { Download, Upload } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { Button } from '../primitives';
import { createDocumentPage } from '../lib/document';
import type { DocumentPage } from '../lib/document';
import { getCollaborationSession } from '../lib/collection';

interface LexicalDocumentEditorProps {
  docId: string;
  docTitle: string;
  page: DocumentPage;
  onPageChange: (page: DocumentPage) => void;
}

function createMarkdownFilename(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'document'}.md`;
}

function DocumentPlaceholder() {
  return (
    <div className="editor-document-placeholder" aria-hidden="true">
      Start writing your world-building notes…
    </div>
  );
}

function MarkdownPersistencePlugin({
  initialMarkdown,
  onPageChange,
}: {
  initialMarkdown: string;
  onPageChange: (page: DocumentPage) => void;
}) {
  const lastSavedMarkdownRef = useRef(initialMarkdown);

  return (
    <OnChangePlugin
      ignoreSelectionChange
      onChange={(editorState) => {
        editorState.read(() => {
          const markdown = $convertToMarkdownString(TRANSFORMERS);
          if (markdown === lastSavedMarkdownRef.current) {
            return;
          }

          lastSavedMarkdownRef.current = markdown;
          onPageChange(createDocumentPage(markdown));
        });
      }}
    />
  );
}

function MarkdownTransferPlugin({ docTitle }: { docTitle: string }) {
  const [editor] = useLexicalComposerContext();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = useCallback(() => {
    editor.getEditorState().read(() => {
      const markdown = $convertToMarkdownString(TRANSFORMERS);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = createMarkdownFilename(docTitle);
      link.click();
      URL.revokeObjectURL(url);
    });
  }, [docTitle, editor]);

  const handleImport = useCallback(
    async (file: File | null) => {
      if (!file) return;
      const markdown = await file.text();

      editor.update(() => {
        $getRoot().clear();
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      });
    },
    [editor],
  );

  return (
    <div className="editor-document-actions">
      <input
        ref={inputRef}
        className="editor-document-file-input"
        type="file"
        accept=".md,text/markdown,text/plain"
        onChange={(event) => {
          void handleImport(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />
      <Button
        className="editor-document-action"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        title="Import Markdown"
      >
        <Upload size={14} aria-hidden="true" />
        Import Markdown
      </Button>
      <Button
        className="editor-document-action"
        variant="outline"
        size="sm"
        onClick={handleExport}
        title="Export Markdown"
      >
        <Download size={14} aria-hidden="true" />
        Export Markdown
      </Button>
    </div>
  );
}

export function LexicalDocumentEditor({
  docId,
  docTitle,
  page,
  onPageChange,
}: LexicalDocumentEditorProps) {
  const session = useMemo(() => getCollaborationSession(docId), [docId]);

  const initialConfig = useMemo<InitialConfigType>(
    () => ({
      namespace: 'litd-document-editor',
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, LinkNode],
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
      editor.update(() => {
        $convertFromMarkdownString(page.markdown, TRANSFORMERS);
      });
    },
    [page.markdown],
  );

  return (
    <div className="editor-document-shell">
      <div className="editor-document-inner">
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
            <MarkdownTransferPlugin docTitle={docTitle} />
            <RichTextPlugin
              contentEditable={<ContentEditable className="editor-document-content" />}
              placeholder={<DocumentPlaceholder />}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <MarkdownPersistencePlugin initialMarkdown={page.markdown} onPageChange={onPageChange} />
          </LexicalCollaboration>
        </LexicalComposer>
      </div>
    </div>
  );
}
