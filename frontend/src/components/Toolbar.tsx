import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface ToolbarProps {
  editor: any;
  isDarkMode?: boolean;
}

export function Toolbar({ editor, isDarkMode = false }: ToolbarProps) {
  if (!editor) return null;

  const bgColor = isDarkMode ? '#2d2d2d' : '#fff';
  const borderColor = isDarkMode ? '#404040' : '#e0e0e0';
  const textColor = isDarkMode ? '#e0e0e0' : '#202124';
  const hoverBg = isDarkMode ? '#3d3d3d' : '#f5f5f5';
  const activeBg = isDarkMode ? '#4a5568' : '#e8f0fe';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 16px',
      backgroundColor: bgColor,
      borderBottom: `1px solid ${borderColor}`,
      flexWrap: 'wrap',
    }}>
      {/* Undo/Redo */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          style={{
            padding: '6px 12px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: editor.can().chain().focus().undo().run() ? 'pointer' : 'not-allowed',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            opacity: editor.can().chain().focus().undo().run() ? 1 : 0.5,
            color: textColor,
          }}
          onMouseEnter={(e) => {
            if (editor.can().chain().focus().undo().run()) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Undo (Ctrl+Z)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          style={{
            padding: '6px 12px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: editor.can().chain().focus().redo().run() ? 'pointer' : 'not-allowed',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            opacity: editor.can().chain().focus().redo().run() ? 1 : 0.5,
            color: textColor,
          }}
          onMouseEnter={(e) => {
            if (editor.can().chain().focus().redo().run()) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Redo (Ctrl+Y)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" />
          </svg>
        </button>
      </div>

      {/* Text Formatting */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          style={{
            padding: '6px 12px',
            border: 'none',
            backgroundColor: editor.isActive('bold') ? activeBg : 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            fontWeight: 'bold',
            color: textColor,
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('bold')) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('bold')) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          style={{
            padding: '6px 12px',
            border: 'none',
            backgroundColor: editor.isActive('italic') ? activeBg : 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            fontStyle: 'italic',
            color: textColor,
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('italic')) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('italic')) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'is-active' : ''}
          style={{
            padding: '6px 12px',
            border: 'none',
            backgroundColor: editor.isActive('strike') ? activeBg : 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            textDecoration: 'line-through',
            color: textColor,
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('strike')) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('strike')) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Strikethrough"
        >
          S
        </button>
      </div>

      {/* Headings */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
          style={{
            padding: '6px 12px',
            border: 'none',
            backgroundColor: editor.isActive('heading', { level: 1 }) ? activeBg : 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: textColor,
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('heading', { level: 1 })) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('heading', { level: 1 })) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Heading 1"
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          style={{
            padding: '6px 12px',
            border: 'none',
            backgroundColor: editor.isActive('heading', { level: 2 }) ? activeBg : 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: textColor,
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('heading', { level: 2 })) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('heading', { level: 2 })) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Heading 2"
        >
          H2
        </button>
      </div>

      {/* Lists */}
      <div style={{ display: 'flex', gap: '2px' }}>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          style={{
            padding: '6px 12px',
            border: 'none',
            backgroundColor: editor.isActive('bulletList') ? activeBg : 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            color: textColor,
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('bulletList')) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('bulletList')) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Bullet List"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="6" cy="6" r="2" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="6" cy="18" r="2" />
            <line x1="10" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" />
            <line x1="10" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
            <line x1="10" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          style={{
            padding: '6px 12px',
            border: 'none',
            backgroundColor: editor.isActive('orderedList') ? activeBg : 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            color: textColor,
          }}
          onMouseEnter={(e) => {
            if (!editor.isActive('orderedList')) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('orderedList')) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Numbered List"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <line x1="6" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" />
            <line x1="6" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
            <line x1="6" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" />
            <text x="2" y="8" fontSize="12" fill="currentColor">1.</text>
            <text x="2" y="14" fontSize="12" fill="currentColor">2.</text>
            <text x="2" y="20" fontSize="12" fill="currentColor">3.</text>
          </svg>
        </button>
      </div>
    </div>
  );
}

