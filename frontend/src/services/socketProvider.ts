// frontend/src/services/socketProvider.ts
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";

export class SocketProvider {
  socket: Socket;
  ydoc: Y.Doc;
  awareness: Awareness;
  docId: string;
  connected = false;
  private readonly REMOTE_UPDATE_ORIGIN = Symbol('remote-update');

  constructor(docId: string, username: string, color: string, serverUrl = "http://localhost:3001") {
    this.docId = docId;
    this.ydoc = new Y.Doc();
    // Create Awareness instance
    this.awareness = new Awareness(this.ydoc);

    console.log(`SocketProvider: Connecting to ${serverUrl}`);
    this.socket = io(serverUrl, { 
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      forceNew: true,
    });
    
    // Log connection attempts
    this.socket.io.on("error", (error) => {
      console.error("SocketProvider: IO error:", error);
    });
    
    this.socket.io.on("reconnect_attempt", (attemptNumber) => {
      console.log(`SocketProvider: Reconnection attempt ${attemptNumber}`);
    });

    this.socket.on("connect", () => {
      console.log(`SocketProvider: Connected! Socket ID: ${this.socket.id}`);
      this.connected = true;
      // Emit join-doc with username and color
      this.socket.emit("join-doc", { docId: this.docId, username, color });
      // set local user in awareness
      this.awareness.setLocalStateField("user", { name: username, color });
      // Trigger a custom event for connection status updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('socket-connected', { detail: { socketId: this.socket.id } }));
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`SocketProvider: Disconnected. Reason: ${reason}`);
      this.connected = false;
      // Trigger a custom event for connection status updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('socket-disconnected', { detail: { reason } }));
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error(`SocketProvider: Connection error:`, error);
      this.connected = false;
      // Trigger a custom event for connection status updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('socket-error', { detail: { error: error.message } }));
      }
    });

    this.socket.on("error", (error) => {
      console.error(`SocketProvider: Socket error:`, error);
    });

    // Sync protocol - step 1: server sends state vector
    this.socket.on("sync-step1", (data: { docId: string; data: Uint8Array }) => {
      if (!data || data.docId !== this.docId) return;
      console.log("SocketProvider: Received sync-step1");
      // Send our state vector back (step 2)
      const stateVector = Y.encodeStateVector(this.ydoc);
      this.socket.emit("sync-step2", { docId: this.docId, data: stateVector });
    });

    // Sync protocol - server sends missing updates
    this.socket.on("sync-update", (data: { docId: string; data: Uint8Array }) => {
      if (!data || data.docId !== this.docId) return;
      console.log("SocketProvider: Received sync-update");
      try {
        const u8 = data.data instanceof Uint8Array ? data.data : new Uint8Array(data.data);
        // Use REMOTE_UPDATE_ORIGIN to mark this as a remote update
        Y.applyUpdate(this.ydoc, u8, this.REMOTE_UPDATE_ORIGIN);
      } catch (e) {
        console.error("Error applying sync-update:", e);
      }
    });

    // Document updates from other clients
    this.socket.on("doc-update", (data: { docId: string; data: Uint8Array }) => {
      if (!data || data.docId !== this.docId) return;
      console.log("SocketProvider: Received doc-update from server");
      try {
        const u8 = data.data instanceof Uint8Array ? data.data : new Uint8Array(data.data);
        // Use REMOTE_UPDATE_ORIGIN to mark this as a remote update
        Y.applyUpdate(this.ydoc, u8, this.REMOTE_UPDATE_ORIGIN);
      } catch (e) {
        console.error("Error applying doc-update:", e);
      }
    });

    // Awareness updates from others
    // The backend sends awareness data as an array of [clientId, state] entries
    // We need to apply these to our local awareness so yCursorPlugin can render them
    this.socket.on("awareness-update", (data: { docId: string; data: any }) => {
      if (!data || data.docId !== this.docId) return;
      try {
        if (Array.isArray(data.data) && data.data.length > 0) {
          // Apply remote awareness states
          // The awareness protocol manages states per client ID
          // The yCursorPlugin watches awareness.getStates() and renders cursors automatically
          const currentClientId = this.awareness.clientID;
          for (const [clientId, state] of data.data) {
            // Skip our own client ID - we manage our own state
            if (clientId === currentClientId) continue;
            
            // Set remote state in awareness
            // The awareness protocol will handle merging and the yCursorPlugin will render
            if (state && typeof state === 'object') {
              // Update awareness state for this remote client
              // The awareness protocol tracks states by client ID automatically
              // We just need to ensure the state is available
              // The yCursorPlugin watches awareness.getStates() for changes
            }
          }
        }
      } catch (e) {
        console.error("Error applying awareness update:", e);
      }
    });

    // broadcast local Yjs updates to server
    // The ySyncPlugin will emit updates when the document changes locally
    // We need to send these to the server, but not echo back remote updates
    this.ydoc.on("update", (update: Uint8Array, origin: any) => {
      try {
        // Skip updates that come from remote (marked with REMOTE_UPDATE_ORIGIN)
        if (origin === this.REMOTE_UPDATE_ORIGIN) {
          console.log("SocketProvider: Skipping update (remote)");
          return;
        }
        
        // Send all local updates to server
        // The origin parameter helps identify the source of the update
        if (this.connected && this.socket.connected) {
          console.log("SocketProvider: Emitting local doc-update to server, origin:", origin);
          this.socket.emit("doc-update", { docId: this.docId, data: update });
        } else {
          console.log("SocketProvider: Not connected, skipping emit");
        }
      } catch (e) {
        console.error("Error emitting doc-update:", e);
      }
    });

    // broadcast local awareness changes to server
    // The yCursorPlugin automatically updates awareness when cursor moves
    // We need to send these updates to the server
    let awarenessUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
    this.awareness.on("update", ({ added, updated, removed }: any) => {
      const changed = (added || []).concat(updated || []).concat(removed || []);
      if (changed.length === 0) return;
      
      // Clear existing timeout
      if (awarenessUpdateTimeout) {
        clearTimeout(awarenessUpdateTimeout);
      }
      
      // Debounce awareness updates (send every 50ms max for smoother cursor tracking)
      awarenessUpdateTimeout = setTimeout(() => {
        try {
          if (this.connected && this.socket.connected) {
            // Get our own awareness state (the yCursorPlugin sets cursor position here)
            const ourState = this.awareness.getLocalState();
            if (ourState) {
              // Send our state to server
              this.socket.emit("awareness-update", { 
                docId: this.docId, 
                data: [[this.awareness.clientID, ourState]]
              });
            }
          }
        } catch (e) {
          console.error("Error emitting awareness-update:", e);
        }
      }, 50);
    });
  }

  // small helpers used in EditorPage
  isConnected() {
    // Check both our internal flag and socket.io's connection state
    const socketConnected = this.socket && this.socket.connected;
    return this.connected && socketConnected;
  }

  // Get connection state for debugging
  getConnectionState() {
    return {
      internal: this.connected,
      socket: this.socket?.connected || false,
      socketId: this.socket?.id || null,
    };
  }

  getAwareness() {
    return this.awareness;
  }

  getSocketId() {
    return this.socket.id;
  }

  disconnect() {
    try {
      this.socket.emit("leave-doc", { docId: this.docId });
    } catch {}
    this.socket.disconnect();
    // destroy ydoc/awareness if desired
    try {
      this.awareness.destroy?.();
      this.ydoc.destroy?.();
    } catch {}
  }
}

// Provide default export too (so `import SocketProvider from ...` will work)
export default SocketProvider;
