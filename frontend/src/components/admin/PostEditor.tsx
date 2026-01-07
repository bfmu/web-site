import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { useEffect, useState } from 'react';
import { ImageLibraryModal } from './ImageLibraryModal';

interface PostEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function PostEditor({ content, onChange, placeholder = 'Escribe tu contenido aquí...' }: PostEditorProps) {
  const [showImageModal, setShowImageModal] = useState(false);
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 underline hover:text-indigo-800',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4 dark:prose-invert',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="h-96 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleHeading = (level: 1 | 2 | 3) => editor.chain().focus().toggleHeading({ level }).run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();
  const toggleCode = () => editor.chain().focus().toggleCode().run();
  const toggleCodeBlock = () => editor.chain().focus().toggleCodeBlock().run();
  const setLink = () => {
    const url = window.prompt('URL del enlace:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };
  const unsetLink = () => editor.chain().focus().unsetLink().run();
  const insertImage = () => {
    setShowImageModal(true);
  };
  
  const handleImageSelect = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="rounded-lg border border-gray-300 dark:border-gray-600">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-300 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-800">
        <button
          type="button"
          onClick={toggleBold}
          className={`rounded px-2 py-1 text-sm font-semibold transition-colors ${
            editor.isActive('bold')
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Negrita (Ctrl+B)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          className={`rounded px-2 py-1 text-sm italic transition-colors ${
            editor.isActive('italic')
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Cursiva (Ctrl+I)"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={toggleUnderline}
          className={`rounded px-2 py-1 text-sm underline transition-colors ${
            editor.isActive('underline')
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Subrayado (Ctrl+U)"
        >
          <u>U</u>
        </button>

        <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600" />

        <button
          type="button"
          onClick={() => toggleHeading(1)}
          className={`rounded px-2 py-1 text-sm font-semibold transition-colors ${
            editor.isActive('heading', { level: 1 })
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Título 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => toggleHeading(2)}
          className={`rounded px-2 py-1 text-sm font-semibold transition-colors ${
            editor.isActive('heading', { level: 2 })
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Título 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => toggleHeading(3)}
          className={`rounded px-2 py-1 text-sm font-semibold transition-colors ${
            editor.isActive('heading', { level: 3 })
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Título 3"
        >
          H3
        </button>

        <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600" />

        <button
          type="button"
          onClick={toggleBulletList}
          className={`rounded px-2 py-1 text-sm transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Lista con viñetas"
        >
          • Lista
        </button>
        <button
          type="button"
          onClick={toggleOrderedList}
          className={`rounded px-2 py-1 text-sm transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Lista numerada"
        >
          1. Lista
        </button>
        <button
          type="button"
          onClick={toggleBlockquote}
          className={`rounded px-2 py-1 text-sm transition-colors ${
            editor.isActive('blockquote')
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Cita"
        >
          " Cita
        </button>

        <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600" />

        <button
          type="button"
          onClick={toggleCode}
          className={`rounded px-2 py-1 text-sm font-mono transition-colors ${
            editor.isActive('code')
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Código inline"
        >
          {'</>'}
        </button>
        <button
          type="button"
          onClick={toggleCodeBlock}
          className={`rounded px-2 py-1 text-sm font-mono transition-colors ${
            editor.isActive('codeBlock')
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Bloque de código"
        >
          {'{ }'}
        </button>

        <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-600" />

        <button
          type="button"
          onClick={editor.isActive('link') ? unsetLink : setLink}
          className={`rounded px-2 py-1 text-sm transition-colors ${
            editor.isActive('link')
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
              : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          title="Enlace"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={insertImage}
          className="rounded px-2 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
          title="Insertar imagen"
        >
          🖼️
        </button>
      </div>

      {/* Editor */}
      <div className="bg-white dark:bg-gray-900">
        <EditorContent editor={editor} />
      </div>

      {/* Image Library Modal */}
      <ImageLibraryModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onSelect={handleImageSelect}
        allowUpload={true}
      />
    </div>
  );
}

