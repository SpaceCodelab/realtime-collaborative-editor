// frontend/src/components/RichEditor.tsx
import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Blockquote from "@tiptap/extension-blockquote";
import CodeBlock from "@tiptap/extension-code-block";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import { FontSize } from "../extensions/FontSize";
import { FontFamily } from "../extensions/FontFamily";
import { YjsExtension } from "../extensions/YjsExtension";
import { Toolbar } from "./Toolbar";

type Props = {
  socketProvider: any; // SocketProvider instance (can tighten types later)
  docId: string;
  isDarkMode?: boolean;
  onWordCountChange?: (count: number) => void;
};

function RichEditor({ socketProvider, isDarkMode = false, onWordCountChange }: Props) {
  console.log('RichEditor: Rendering, socketProvider:', socketProvider);
  
  const ydoc = socketProvider?.ydoc;
  const awareness = socketProvider?.getAwareness();
  
  const hasYjs = !!(ydoc && awareness);
  console.log('RichEditor: Yjs available?', hasYjs, 'ydoc:', !!ydoc, 'awareness:', !!awareness);
  
  const editor = useEditor({ 
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      Blockquote,
      CodeBlock,
      HorizontalRule,
      // Add Yjs extension with proper configuration
      ...(hasYjs ? [YjsExtension.configure({
        ydoc: ydoc!,
        awareness: awareness!,
      })] : []),
    ] as any, 
    // Don't set content when using Yjs - ySyncPlugin will sync from Yjs document
    content: hasYjs ? undefined : "<p></p>",
    editable: true,
    onUpdate: ({ editor }) => {
      if (onWordCountChange) {
        const text = editor.getText();
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        onWordCountChange(words.length);
      }
    },
  }, [hasYjs]); // Recreate editor when Yjs availability changes
  
  console.log('RichEditor: Editor created:', editor, 'hasYjs:', hasYjs);
  
  // Update Yjs extension when socketProvider changes
  useEffect(() => {
    if (!editor || !ydoc || !awareness) return;
    
    // The extension should automatically pick up the new ydoc/awareness
    // But we may need to force a re-render
    const view = (editor as any).view;
    if (view) {
      // Trigger a state update to ensure plugins are using latest ydoc/awareness
      view.dispatch(view.state.tr);
    }
  }, [editor, ydoc, awareness]);

  if (!editor) {
    console.log('RichEditor: Editor not ready yet');
    return (
      <div style={{ 
        height: "100%", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "#fff",
        fontSize: "18px",
        color: "#333"
      }}>
        <div>Initializing editor...</div>
      </div>
    );
  }

  console.log('RichEditor: Rendering editor content');
  const bgColor = isDarkMode ? '#1e1e1e' : '#fff';
  const editorBg = isDarkMode ? '#2d2d2d' : '#fff';
  const editorBorder = isDarkMode ? '#404040' : 'transparent';
  
  return (
    <div style={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column",
      backgroundColor: bgColor
    }}>
      {/* Toolbar */}
      {editor && <Toolbar editor={editor} isDarkMode={isDarkMode} />}
      
      {/* Editor Content */}
      <div style={{ 
        flex: 1, 
        overflow: "auto",
        minHeight: 0,
        backgroundColor: bgColor,
        display: "flex",
        justifyContent: "center",
        paddingTop: "20px",
        paddingBottom: "100px"
      }}>
        <div style={{
          width: "100%",
          maxWidth: "816px",
          minHeight: "1056px",
          backgroundColor: editorBg,
          padding: "96px 120px",
          boxShadow: isDarkMode 
            ? "0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)"
            : "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
          border: `1px solid ${editorBorder}`
        }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

export default RichEditor;
export { RichEditor };
