import { useState, useRef, useEffect } from 'react';

interface ToolbarProps {
  editor: any;
  isDarkMode?: boolean;
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 30, 36, 48, 60, 72, 96];
const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
];

const COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
  '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
  '#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD',
  '#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0',
  '#A61C00', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79',
  '#85200C', '#990000', '#B45F06', '#BF9000', '#38761D', '#134F5C', '#1155CC', '#0B5394', '#351C75', '#741B47',
  '#5B0F00', '#660000', '#783F04', '#7F6000', '#274E13', '#0C343D', '#1C4587', '#073763', '#20124D', '#4C1130',
];

export function Toolbar({ editor, isDarkMode = false }: ToolbarProps) {
  if (!editor) return null;

  const [showFontSize, setShowFontSize] = useState(false);
  const [showFontFamily, setShowFontFamily] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const fontSizeRef = useRef<HTMLDivElement>(null);
  const fontFamilyRef = useRef<HTMLDivElement>(null);
  const textColorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fontSizeRef.current && !fontSizeRef.current.contains(event.target as Node)) {
        setShowFontSize(false);
      }
      if (fontFamilyRef.current && !fontFamilyRef.current.contains(event.target as Node)) {
        setShowFontFamily(false);
      }
      if (textColorRef.current && !textColorRef.current.contains(event.target as Node)) {
        setShowTextColor(false);
      }
      if (highlightRef.current && !highlightRef.current.contains(event.target as Node)) {
        setShowHighlight(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const bgColor = isDarkMode ? '#2d2d2d' : '#fff';
  const borderColor = isDarkMode ? '#404040' : '#e0e0e0';
  const textColor = isDarkMode ? '#e0e0e0' : '#202124';
  const hoverBg = isDarkMode ? '#3d3d3d' : '#f5f5f5';
  const activeBg = isDarkMode ? '#4a5568' : '#e8f0fe';
  const dropdownBg = isDarkMode ? '#3d3d3d' : '#fff';
  const dropdownBorder = isDarkMode ? '#555' : '#ddd';

  const getCurrentFontSize = () => {
    try {
      const attrs = editor.getAttributes('textStyle');
      if (attrs && attrs.fontSize) {
        const size = typeof attrs.fontSize === 'string' 
          ? parseInt(attrs.fontSize.replace('pt', '').replace('px', '').trim()) 
          : attrs.fontSize;
        return isNaN(size) ? 11 : size;
      }
    } catch (e) {
      console.error('Error getting font size:', e);
    }
    return 11; // default
  };

  const getCurrentFontFamily = () => {
    try {
      const attrs = editor.getAttributes('textStyle');
      if (attrs && attrs.fontFamily) {
        return attrs.fontFamily;
      }
    } catch (e) {
      console.error('Error getting font family:', e);
    }
    return 'Arial, sans-serif';
  };

  const getCurrentTextColor = () => {
    return editor.getAttributes('textStyle').color || '#000000';
  };

  const getCurrentHighlight = () => {
    return editor.getAttributes('highlight').color || 'transparent';
  };

  const handleSetLink = () => {
    if (linkUrl) {
      if (linkText) {
        editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText}</a>`).run();
      } else {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to);
        if (selectedText) {
          editor.chain().focus().setLink({ href: linkUrl }).run();
        } else {
          editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkUrl}</a>`).run();
        }
      }
      setShowLinkDialog(false);
      setLinkUrl('');
      setLinkText('');
    }
  };

  const handleUnsetLink = () => {
    editor.chain().focus().unsetLink().run();
    setShowLinkDialog(false);
  };

  const buttonStyle = (isActive: boolean = false) => ({
    padding: '6px 12px',
    border: 'none',
    backgroundColor: isActive ? activeBg : 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    color: textColor,
    fontSize: '14px',
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '8px 16px',
      backgroundColor: bgColor,
      borderBottom: `1px solid ${borderColor}`,
      flexWrap: 'wrap',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Undo/Redo */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          style={{
            ...buttonStyle(),
            opacity: editor.can().chain().focus().undo().run() ? 1 : 0.5,
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
            ...buttonStyle(),
            opacity: editor.can().chain().focus().redo().run() ? 1 : 0.5,
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

      {/* Font Family */}
      <div ref={fontFamilyRef} style={{ position: 'relative', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => setShowFontFamily(!showFontFamily)}
          style={buttonStyle()}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Font Family"
        >
          <span style={{ minWidth: '100px', textAlign: 'left' }}>
            {FONT_FAMILIES.find(f => f.value === getCurrentFontFamily())?.label || 'Arial'}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {showFontFamily && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            minWidth: '180px',
          }}>
            {FONT_FAMILIES.map((font) => (
              <button
                key={font.value}
                onClick={() => {
                  editor.chain().focus().setFontFamily(font.value).run();
                  setShowFontFamily(false);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: font.value,
                  color: textColor,
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {font.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Font Size */}
      <div ref={fontSizeRef} style={{ position: 'relative', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => setShowFontSize(!showFontSize)}
          style={buttonStyle()}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Font Size"
        >
          <span style={{ minWidth: '40px', textAlign: 'left' }}>{getCurrentFontSize()}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px' }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {showFontSize && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            minWidth: '80px',
          }}>
            {FONT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => {
                  editor.chain().focus().setFontSize(`${size}pt`).run();
                  setShowFontSize(false);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: textColor,
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text Formatting */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={buttonStyle(editor.isActive('bold'))}
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
          <strong>B</strong>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={buttonStyle(editor.isActive('italic'))}
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
          <em>I</em>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          style={buttonStyle(editor.isActive('underline'))}
          onMouseEnter={(e) => {
            if (!editor.isActive('underline')) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('underline')) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Underline (Ctrl+U)"
        >
          <u>U</u>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          style={buttonStyle(editor.isActive('strike'))}
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
          <s>S</s>
        </button>
      </div>

      {/* Text Color */}
      <div ref={textColorRef} style={{ position: 'relative', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => setShowTextColor(!showTextColor)}
          style={buttonStyle()}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Text Color"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <div style={{
            width: '16px',
            height: '3px',
            backgroundColor: getCurrentTextColor(),
            marginLeft: '4px',
            borderRadius: '2px',
          }} />
        </button>
        {showTextColor && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: '8px',
            zIndex: 1000,
            width: '200px',
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '4px',
          }}>
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  editor.chain().focus().setColor(color).run();
                  setShowTextColor(false);
                }}
                style={{
                  width: '18px',
                  height: '18px',
                  backgroundColor: color,
                  border: color === '#FFFFFF' ? `1px solid ${borderColor}` : 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>

      {/* Highlight Color */}
      <div ref={highlightRef} style={{ position: 'relative', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => setShowHighlight(!showHighlight)}
          style={buttonStyle(editor.isActive('highlight'))}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
          onMouseLeave={(e) => {
            if (!editor.isActive('highlight')) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Highlight Color"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          <div style={{
            width: '16px',
            height: '3px',
            backgroundColor: getCurrentHighlight() === 'transparent' ? '#FFFF00' : getCurrentHighlight(),
            marginLeft: '4px',
            borderRadius: '2px',
          }} />
        </button>
        {showHighlight && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: '8px',
            zIndex: 1000,
            width: '200px',
            display: 'grid',
            gridTemplateColumns: 'repeat(10, 1fr)',
            gap: '4px',
          }}>
            <button
              onClick={() => {
                editor.chain().focus().unsetHighlight().run();
                setShowHighlight(false);
              }}
              style={{
                gridColumn: 'span 10',
                padding: '6px',
                border: `1px solid ${borderColor}`,
                borderRadius: '2px',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: textColor,
                marginBottom: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              None
            </button>
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => {
                  editor.chain().focus().toggleHighlight({ color }).run();
                  setShowHighlight(false);
                }}
                style={{
                  width: '18px',
                  height: '18px',
                  backgroundColor: color,
                  border: color === '#FFFFFF' ? `1px solid ${borderColor}` : 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  padding: 0,
                }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>

      {/* Headings */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          style={buttonStyle(editor.isActive('heading', { level: 1 }))}
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
          style={buttonStyle(editor.isActive('heading', { level: 2 }))}
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
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          style={buttonStyle(editor.isActive('heading', { level: 3 }))}
          onMouseEnter={(e) => {
            if (!editor.isActive('heading', { level: 3 })) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('heading', { level: 3 })) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Heading 3"
        >
          H3
        </button>
      </div>

      {/* Alignment */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          style={buttonStyle(editor.isActive({ textAlign: 'left' }))}
          onMouseEnter={(e) => {
            if (!editor.isActive({ textAlign: 'left' })) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive({ textAlign: 'left' })) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Align Left"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          style={buttonStyle(editor.isActive({ textAlign: 'center' }))}
          onMouseEnter={(e) => {
            if (!editor.isActive({ textAlign: 'center' })) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive({ textAlign: 'center' })) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Align Center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          style={buttonStyle(editor.isActive({ textAlign: 'right' }))}
          onMouseEnter={(e) => {
            if (!editor.isActive({ textAlign: 'right' })) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive({ textAlign: 'right' })) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Align Right"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="9" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          style={buttonStyle(editor.isActive({ textAlign: 'justify' }))}
          onMouseEnter={(e) => {
            if (!editor.isActive({ textAlign: 'justify' })) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive({ textAlign: 'justify' })) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Justify"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Lists */}
      <div style={{ display: 'flex', gap: '2px', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          style={buttonStyle(editor.isActive('bulletList'))}
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
          style={buttonStyle(editor.isActive('orderedList'))}
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

      {/* Link */}
      <div style={{ position: 'relative', marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => {
            const url = editor.getAttributes('link').href;
            if (url) {
              setLinkUrl(url);
            }
            setShowLinkDialog(!showLinkDialog);
          }}
          style={buttonStyle(editor.isActive('link'))}
          onMouseEnter={(e) => {
            if (!editor.isActive('link')) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('link')) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Insert Link"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </button>
        {showLinkDialog && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: dropdownBg,
            border: `1px solid ${dropdownBorder}`,
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: '12px',
            zIndex: 1000,
            minWidth: '300px',
          }}>
            <input
              type="text"
              placeholder="URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                marginBottom: '8px',
                border: `1px solid ${borderColor}`,
                borderRadius: '4px',
                backgroundColor: bgColor,
                color: textColor,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSetLink();
                } else if (e.key === 'Escape') {
                  setShowLinkDialog(false);
                }
              }}
              autoFocus
            />
            <input
              type="text"
              placeholder="Link text (optional)"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                marginBottom: '8px',
                border: `1px solid ${borderColor}`,
                borderRadius: '4px',
                backgroundColor: bgColor,
                color: textColor,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSetLink();
                } else if (e.key === 'Escape') {
                  setShowLinkDialog(false);
                }
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSetLink}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#1a73e8',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>
              {editor.isActive('link') && (
                <button
                  onClick={handleUnsetLink}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#ea4335',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              )}
              <button
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                  setLinkText('');
                }}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: textColor,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Blockquote */}
      <div style={{ marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          style={buttonStyle(editor.isActive('blockquote'))}
          onMouseEnter={(e) => {
            if (!editor.isActive('blockquote')) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('blockquote')) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Quote"
        >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
        </svg>
      </button>
      </div>

      {/* Code Block */}
      <div style={{ marginRight: '8px', paddingRight: '8px', borderRight: `1px solid ${borderColor}` }}>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          style={buttonStyle(editor.isActive('codeBlock'))}
          onMouseEnter={(e) => {
            if (!editor.isActive('codeBlock')) {
              e.currentTarget.style.backgroundColor = hoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (!editor.isActive('codeBlock')) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
          title="Code Block"
        >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </button>
      </div>

      {/* Horizontal Rule */}
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        style={buttonStyle()}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        title="Insert Horizontal Line"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      </button>
    </div>
  );
}
