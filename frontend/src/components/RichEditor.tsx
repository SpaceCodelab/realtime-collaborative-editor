// frontend/src/components/RichEditor.tsx
import React, { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { EditorState } from "prosemirror-state";
import * as Y from "yjs";
import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from "y-prosemirror";
import { Toolbar } from "./Toolbar";

type Props = {
  socketProvider: any; // SocketProvider instance (can tighten types later)
  docId: string;
  isDarkMode?: boolean;
  onWordCountChange?: (count: number) => void;
};

function RichEditor({ socketProvider, docId, isDarkMode = false, onWordCountChange }: Props) {
  console.log('RichEditor: Rendering, socketProvider:', socketProvider);
  
  const editor = useEditor({ 
    extensions: [StarterKit], 
    content: "<p></p>",
    editable: true,
    onUpdate: ({ editor }) => {
      if (onWordCountChange) {
        const text = editor.getText();
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        onWordCountChange(words.length);
      }
    },
  });
  
  console.log('RichEditor: Editor created:', editor);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!editor || !socketProvider || initializedRef.current) return;
    
    const ydoc: Y.Doc = socketProvider.ydoc;
    const awareness = socketProvider.getAwareness();

    if (!ydoc || !awareness) return;

    initializedRef.current = true;

    // prosemirror fragment name
    const xmlFragment = ydoc.getXmlFragment("prosemirror");
    const yjsPlugins = [
      ySyncPlugin(xmlFragment),
      yCursorPlugin(awareness),
      yUndoPlugin()
    ];

    // Get the current editor view
    const view = (editor as any).view;
    if (!view) return;

    // Create new state with Yjs plugins
    const currentState = view.state;
    const newState = EditorState.create({
      schema: currentState.schema,
      plugins: [...currentState.plugins, ...yjsPlugins],
    });

    // Update the editor view with the new state
    view.updateState(newState);

    return () => {
      // Cleanup if needed
    };
  }, [editor, socketProvider]);

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
