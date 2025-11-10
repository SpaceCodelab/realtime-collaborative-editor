import { Extension } from '@tiptap/core';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { ySyncPlugin, yCursorPlugin, yUndoPlugin } from 'y-prosemirror';

export interface YjsOptions {
  ydoc: Y.Doc;
  awareness: Awareness;
}

export const YjsExtension = Extension.create<YjsOptions>({
  name: 'yjs',

  addOptions() {
    return {
      ydoc: null as any,
      awareness: null as any,
    };
  },

  addProseMirrorPlugins() {
    if (!this.options.ydoc || !this.options.awareness) {
      console.warn('YjsExtension: ydoc or awareness not available');
      return [];
    }

    console.log('YjsExtension: Adding y-prosemirror plugins');
    const xmlFragment = this.options.ydoc.getXmlFragment('prosemirror');
    
    return [
      ySyncPlugin(xmlFragment),
      yCursorPlugin(this.options.awareness),
      yUndoPlugin(),
    ];
  },
});

