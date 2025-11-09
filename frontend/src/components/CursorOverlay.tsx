import { useEffect, useRef } from 'react';
import Quill from 'quill';
import { Awareness } from 'y-protocols/awareness';
import { UserInfo } from '../types';

interface CursorOverlayProps {
  quill: Quill | null;
  awareness: Awareness | null;
  currentUserId: string;
}

/**
 * Renders remote cursors and selections as overlays on the Quill editor
 */
export function CursorOverlay({ quill, awareness, currentUserId }: CursorOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cursorsRef = useRef<Map<number, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!quill || !awareness || !overlayRef.current) return;

    const updateCursors = () => {
      if (!quill || !overlayRef.current) return;

      const states = awareness.getStates();
      const existingClientIds = new Set(cursorsRef.current.keys());
      const currentClientId = awareness.clientID; // Awareness uses numeric client IDs

      // Update or create cursors
      for (const [clientId, state] of states) {
        if (clientId === currentClientId) continue; // Skip own cursor

        existingClientIds.delete(clientId);

        if (state.cursor && state.user) {
          const { anchor, head } = state.cursor;
          const user = state.user as UserInfo;

          // Get cursor position from Quill
          const bounds = quill.getBounds(Math.min(anchor, head), 0);
          if (!bounds) continue;

          let cursorEl = cursorsRef.current.get(clientId);
          if (!cursorEl) {
            cursorEl = document.createElement('div');
            cursorEl.className = 'remote-cursor';
            cursorEl.style.position = 'absolute';
            cursorEl.style.pointerEvents = 'none';
            cursorEl.style.zIndex = '1000';
            overlayRef.current.appendChild(cursorEl);
            cursorsRef.current.set(clientId, cursorEl);
          }

          // Update cursor position and color
          const editorContainer = quill.container.parentElement;
          if (editorContainer) {
            const containerRect = editorContainer.getBoundingClientRect();
            cursorEl.style.left = `${bounds.left}px`;
            cursorEl.style.top = `${bounds.top}px`;
            cursorEl.style.width = '2px';
            cursorEl.style.height = `${bounds.height}px`;
            cursorEl.style.backgroundColor = user.color;
            cursorEl.style.borderLeft = `2px solid ${user.color}`;

            // Add name label
            let labelEl = cursorEl.querySelector('.cursor-label') as HTMLElement;
            if (!labelEl) {
              labelEl = document.createElement('div');
              labelEl.className = 'cursor-label';
              labelEl.style.position = 'absolute';
              labelEl.style.top = '-20px';
              labelEl.style.left = '0';
              labelEl.style.padding = '2px 6px';
              labelEl.style.backgroundColor = user.color;
              labelEl.style.color = 'white';
              labelEl.style.fontSize = '12px';
              labelEl.style.borderRadius = '3px';
              labelEl.style.whiteSpace = 'nowrap';
              cursorEl.appendChild(labelEl);
            }
            labelEl.textContent = user.username;
            labelEl.style.backgroundColor = user.color;

            // Selection highlight
            if (anchor !== head) {
              const start = Math.min(anchor, head);
              const end = Math.max(anchor, head);
              const startBounds = quill.getBounds(start, 0);
              const endBounds = quill.getBounds(end - 1, 0);

              if (startBounds && endBounds) {
                let selectionEl = cursorEl.querySelector('.cursor-selection') as HTMLElement;
                if (!selectionEl) {
                  selectionEl = document.createElement('div');
                  selectionEl.className = 'cursor-selection';
                  selectionEl.style.position = 'absolute';
                  selectionEl.style.pointerEvents = 'none';
                  selectionEl.style.opacity = '0.3';
                  cursorEl.appendChild(selectionEl);
                }

                selectionEl.style.left = `${startBounds.left}px`;
                selectionEl.style.top = `${startBounds.top}px`;
                selectionEl.style.width = `${endBounds.left - startBounds.left}px`;
                selectionEl.style.height = `${endBounds.top - startBounds.top + endBounds.height}px`;
                selectionEl.style.backgroundColor = user.color;
              }
            } else {
              const selectionEl = cursorEl.querySelector('.cursor-selection');
              if (selectionEl) {
                selectionEl.remove();
              }
            }
          }
        }
      }

      // Remove cursors for disconnected clients
      for (const clientId of existingClientIds) {
        const cursorEl = cursorsRef.current.get(clientId);
        if (cursorEl) {
          cursorEl.remove();
          cursorsRef.current.delete(clientId);
        }
      }
    };

    // Update cursors on awareness changes
    const awarenessHandler = () => {
      requestAnimationFrame(updateCursors);
    };

    awareness.on('update', awarenessHandler);
    quill.on('text-change', updateCursors);
    quill.on('selection-change', updateCursors);

    // Initial update
    updateCursors();

    return () => {
      awareness.off('update', awarenessHandler);
      quill.off('text-change', updateCursors);
      quill.off('selection-change', updateCursors);
    };
  }, [quill, awareness, currentUserId]);

  if (!quill) return null;

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

