import type { ReactElement } from 'react';
import { filterSuggestionItems } from '@blocknote/core/extensions';
import {
  useCreateBlockNote,
  useEditorChange,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageLibraryModal } from './ImageLibraryModal';
import { uploadImage } from '@/lib/admin-api';

interface PostEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

function isHTML(str: string): boolean {
  const trimmed = str?.trim() ?? '';
  return trimmed.startsWith('<') || /<[a-z][\s\S]*>/i.test(trimmed);
}

function useIsDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains('dark'));
    });
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

export function PostEditor({
  content,
  onChange,
  placeholder = 'Escribe tu contenido aquí...',
}: PostEditorProps): ReactElement {
  const [showImageModal, setShowImageModal] = useState(false);
  const hasLoadedInitial = useRef(false);
  const isDark = useIsDarkMode();

  const editor = useCreateBlockNote(
    {
      uploadFile: async (file: File) => {
        const result = await uploadImage(file);
        return result.url;
      },
    },
    []
  );

  // Load initial content from props (HTML or Markdown)
  useEffect(() => {
    if (!editor || hasLoadedInitial.current) return;

    const trimmed = content?.trim() ?? '';
    if (!trimmed) {
      hasLoadedInitial.current = true;
      return;
    }

    const loadContent = async () => {
      try {
        const blocks = isHTML(trimmed)
          ? await editor.tryParseHTMLToBlocks(trimmed)
          : await editor.tryParseMarkdownToBlocks(trimmed);

        if (blocks && blocks.length > 0) {
          editor.replaceBlocks(editor.document, blocks);
        }
      } catch (err) {
        console.warn('BlockNote: could not parse initial content', err);
      } finally {
        hasLoadedInitial.current = true;
      }
    };

    loadContent();
  }, [editor, content]);

  // Persist changes to HTML
  useEditorChange(
    async () => {
      if (!editor || !hasLoadedInitial.current) return;

      try {
        const html = await editor.blocksToHTMLLossy(editor.document);
        onChange(html);
      } catch (err) {
        console.warn('BlockNote: could not export to HTML', err);
      }
    },
    editor
  );

  const handleImageSelect = (url: string) => {
    if (!editor) return;

    const imageBlock = { type: 'image' as const, props: { url, caption: '' } };

    try {
      const targetBlock =
        editor.getSelection()?.blocks?.[0] ??
        editor.getTextCursorPosition().block ??
        editor.document[0];
      if (targetBlock) {
        editor.insertBlocks([imageBlock], targetBlock, 'after');
      }
    } catch {
      const first = editor.document[0];
      if (first) editor.insertBlocks([imageBlock], first, 'after');
    }
  };

  const getSlashMenuItems = useMemo(
    () => async (query: string) => {
      const defaultItems = getDefaultReactSlashMenuItems(editor);
      const libraryItem = {
        title: 'Imagen desde librería',
        onItemClick: () => setShowImageModal(true),
        subtext: 'Seleccionar de recursos ya cargados',
        aliases: ['imagen', 'libreria', 'biblioteca', 'library', 'media'],
        icon: (
          <svg width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
      };
      return filterSuggestionItems(
        [...defaultItems, libraryItem],
        query
      );
    },
    [editor]
  );

  if (!editor) {
    return (
      <div className="h-96 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
    );
  }

  return (
    <div className="post-editor">
      <div className="post-editor__inner">
        <BlockNoteView
          editor={editor}
          theme={isDark ? 'dark' : 'light'}
          data-placeholder={placeholder}
          slashMenu={false}
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={getSlashMenuItems}
          />
        </BlockNoteView>
      </div>

      <ImageLibraryModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onSelect={(url) => {
          handleImageSelect(url);
          setShowImageModal(false);
        }}
        allowUpload={true}
      />
    </div>
  );
}
