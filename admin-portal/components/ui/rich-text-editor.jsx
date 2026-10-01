'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import CharacterCount from '@tiptap/extension-character-count'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = '',
  maxLength,
  disabled = false,
  minHeight = '120px',
  className = '',
}) {
  const [charCount, setCharCount] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
      }),
      CharacterCount.configure({
        limit: maxLength || undefined,
      }),
    ],
    content: value || '',
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none p-3 text-sm text-stone-900 leading-relaxed',
        style: `min-height: ${minHeight};`,
      },
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText().trim()
      const html = editor.getHTML()
      const count = editor.storage.characterCount.characters()
      setCharCount(count)
      if (onChange) {
        onChange(text.length === 0 ? '' : html)
      }
    },
    onCreate: ({ editor }) => {
      setCharCount(editor.storage.characterCount.characters())
    },
  })

  useEffect(() => {
    if (!editor) return
    const currentHTML = editor.getHTML()
    const isBothEmpty =
      (!value || value === '') &&
      (editor.getText().trim() === '' || currentHTML === '<p></p>')

    if (!isBothEmpty && value !== currentHTML && !editor.isFocused) {
      editor.commands.setContent(value || '', false)
      setCharCount(editor.storage.characterCount.characters())
    }
  }, [value, editor])

  useEffect(() => {
    if (editor && editor.isEditable !== !disabled) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) {
    return (
      <div
        className={`border border-stone-200 rounded-md bg-stone-50/50 flex items-center justify-center text-xs text-stone-400 ${className}`}
        style={{ minHeight }}
      >
        Loading editor...
      </div>
    )
  }

  const isNearLimit = maxLength && charCount >= maxLength * 0.9
  const isAtLimit = maxLength && charCount >= maxLength

  return (
    <div
      className={`border border-stone-200 rounded-md bg-white focus-within:ring-2 focus-within:ring-[#6B1024]/20 focus-within:border-[#6B1024] transition-all overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-1 p-1.5 border-b border-stone-200 bg-stone-50/80 select-none">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled || !editor.can().chain().focus().toggleBold().run()}
          title="Bold"
          aria-label="Bold"
          className={`p-1.5 rounded text-stone-700 hover:bg-stone-200/70 active:bg-stone-200 transition ${
            editor.isActive('bold')
              ? 'bg-[#6B1024]/10 text-[#6B1024] font-bold'
              : ''
          }`}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled || !editor.can().chain().focus().toggleItalic().run()}
          title="Italic"
          aria-label="Italic"
          className={`p-1.5 rounded text-stone-700 hover:bg-stone-200/70 active:bg-stone-200 transition ${
            editor.isActive('italic')
              ? 'bg-[#6B1024]/10 text-[#6B1024] font-bold'
              : ''
          }`}
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-stone-300 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={disabled || !editor.can().chain().focus().toggleBulletList().run()}
          title="Bullet List"
          aria-label="Bullet List"
          className={`p-1.5 rounded text-stone-700 hover:bg-stone-200/70 active:bg-stone-200 transition ${
            editor.isActive('bulletList')
              ? 'bg-[#6B1024]/10 text-[#6B1024] font-bold'
              : ''
          }`}
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={disabled || !editor.can().chain().focus().toggleOrderedList().run()}
          title="Numbered List"
          aria-label="Numbered List"
          className={`p-1.5 rounded text-stone-700 hover:bg-stone-200/70 active:bg-stone-200 transition ${
            editor.isActive('orderedList')
              ? 'bg-[#6B1024]/10 text-[#6B1024] font-bold'
              : ''
          }`}
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        {maxLength && (
          <div
            className={`ml-auto pr-2 text-xs font-mono select-none ${
              isAtLimit
                ? 'text-red-600 font-semibold'
                : isNearLimit
                  ? 'text-amber-600 font-medium'
                  : 'text-stone-400'
            }`}
          >
            {charCount} / {maxLength}
          </div>
        )}
      </div>

      <div className="relative [&_.ProseMirror_p]:my-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:my-1.5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:my-1.5 [&_.ProseMirror_li]:my-0.5">
        {editor.isEmpty && !editor.isFocused && placeholder && (
          <div
            onClick={() => editor.commands.focus()}
            className="absolute top-3 left-3 text-stone-400 text-sm pointer-events-none select-none"
          >
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
