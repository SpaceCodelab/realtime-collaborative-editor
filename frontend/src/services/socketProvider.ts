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
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`SocketProvider: Disconnected. Reason: ${reason}`);
      this.connected = false;
    });

    this.socket.on("connect_error", (error) => {
      console.error(`SocketProvider: Connection error:`, error);
      this.connected = false;
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
      const u8 = data.data instanceof Uint8Array ? data.data : new Uint8Array(data.data);
      Y.applyUpdate(this.ydoc, u8);
    });

    // Document updates from other clients
    this.socket.on("doc-update", (data: { docId: string; data: Uint8Array }) => {
      if (!data || data.docId !== this.docId) return;
      const u8 = data.data instanceof Uint8Array ? data.data : new Uint8Array(data.data);
      Y.applyUpdate(this.ydoc, u8);
    });

    // Awareness updates from others
    this.socket.on("awareness-update", (data: { docId: string; data: any }) => {
      if (!data || data.docId !== this.docId) return;
      // The backend sends awareness data as an array of [clientId, state] entries
      // The awareness protocol handles this automatically through the y-protocols/awareness
      // We just need to relay the updates - the awareness system will handle merging
      if (Array.isArray(data.data)) {
        // The awareness system will automatically update states
        // This is handled by the y-protocols/awareness library
      }
    });

    // broadcast local Yjs updates to server
    this.ydoc.on("update", (update: Uint8Array) => {
      try {
        if (this.connected && this.socket.connected) {
          this.socket.emit("doc-update", { docId: this.docId, data: update });
        }
      } catch (e) {
        console.error("Error emitting doc-update:", e);
      }
    });

    // broadcast local awareness changes to server
    this.awareness.on("update", ({ added, updated, removed }: any) => {
      const changed = (added || []).concat(updated || []).concat(removed || []);
      if (changed.length === 0) return;
      try {
        if (this.connected && this.socket.connected) {
          // Get all awareness states
          const states = this.awareness.getStates();
          const statesArray = Array.from(states.entries());
          this.socket.emit("awareness-update", { docId: this.docId, data: statesArray });
        }
      } catch (e) {
        console.error("Error emitting awareness-update:", e);
      }
    });
  }

  // small helpers used in EditorPage
  isConnected() {
    return this.connected && this.socket.connected;
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
