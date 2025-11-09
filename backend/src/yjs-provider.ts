import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { Server as SocketIOServer } from 'socket.io';
import { Socket } from 'socket.io';
import { DocumentPersistence } from './persistence';
import { UserInfo } from './types';

/**
 * Manages Yjs documents and awareness for Socket.io connections
 * Handles sync protocol and awareness updates
 */
export class YjsSocketProvider {
  private documents: Map<string, Y.Doc> = new Map();
  private awareness: Map<string, Awareness> = new Map();
  private clients: Map<string, Set<Socket>> = new Map(); // docId -> Set of sockets
  private persistence: DocumentPersistence;
  private saveDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly SAVE_DEBOUNCE_MS = 1000; // 1 second
  private io: SocketIOServer;

  constructor(io: SocketIOServer, persistence: DocumentPersistence) {
    this.io = io;
    this.persistence = persistence;
    this.setupSocketHandlers(io);
  }

  private setupSocketHandlers(io: SocketIOServer): void {
    io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join-doc', async (data: { docId: string; username: string; color: string }) => {
        const { docId, username, color } = data;
        console.log(`Socket ${socket.id} joining doc ${docId} as ${username}`);

        // Join socket.io room for this document
        socket.join(docId);

        // Initialize or get document
        let doc = this.documents.get(docId);
        if (!doc) {
          doc = new Y.Doc();
          this.documents.set(docId, doc);

          // Load persisted state
          const persisted = await this.persistence.loadDocument(docId);
          if (persisted) {
            Y.applyUpdate(doc, persisted);
            console.log(`Loaded persisted state for doc ${docId}`);
          }
        }

        // Initialize or get awareness
        let awareness = this.awareness.get(docId);
        if (!awareness) {
          awareness = new Awareness(doc);
          this.awareness.set(docId, awareness);
        }

        // Track client
        if (!this.clients.has(docId)) {
          this.clients.set(docId, new Set());
        }
        this.clients.get(docId)!.add(socket);

        // Set user info in awareness (server-side awareness for tracking)
        // Note: Awareness client IDs are numeric, but we'll store socket.id in user object
        const userInfo: UserInfo = {
          username,
          color,
          userId: socket.id,
        };
        // Store socket.id mapping for awareness
        (socket as any).docId = docId;
        (socket as any).userInfo = userInfo;

        // Send initial document state (sync step 1)
        const stateVector = Y.encodeStateVector(doc);
        socket.emit('sync-step1', { docId, data: stateVector });

        // Send current awareness state
        const awarenessState = awareness.getStates();
        socket.emit('awareness-update', {
          docId,
          data: Array.from(awarenessState.entries()),
        });

        // Broadcast user joined
        socket.to(docId).emit('user-joined', userInfo);

        // Handle sync step 2 (client sends their state vector, we send missing updates)
        socket.on('sync-step2', async (data: { docId: string; data: Uint8Array }) => {
          if (data.docId !== docId) return;
          const stateVector = data.data;
          const update = Y.encodeStateAsUpdate(doc, stateVector);
          socket.emit('sync-update', { docId, data: update });
        });

        // Handle document updates from client
        socket.on('doc-update', async (data: { docId: string; data: Uint8Array }) => {
          if (data.docId !== docId) return;
          try {
            Y.applyUpdate(doc, data.data);
            // Broadcast to other clients in the room
            socket.to(docId).emit('doc-update', { docId, data: data.data });
            // Persist with debounce
            this.debouncedSave(docId, doc);
          } catch (error) {
            console.error('Error applying update:', error);
          }
        });

        // Handle awareness updates from client
        // Note: Awareness protocol uses binary encoding, but we're using JSON for simplicity
        // In production, you might want to use binary awareness updates for better performance
        socket.on('awareness-update', (data: { docId: string; data: any }) => {
          if (data.docId !== docId) return;
          try {
            // The client sends their local awareness state
            // We need to relay it to other clients
            // The awareness protocol handles client IDs internally (numeric)
            if (data.data && Array.isArray(data.data)) {
              // Update server-side awareness state (for tracking)
              for (const [clientId, state] of data.data) {
                if (state) {
                  // Store the state temporarily for broadcasting
                  // Note: In a real implementation, you'd decode/encode awareness updates properly
                  // For now, we'll just relay the client's state
                }
              }
            }
            // Broadcast awareness update to all other clients in the room
            // The awareness protocol will handle merging on the client side
            this.io.to(docId).emit('awareness-update', {
              docId,
              data: data.data, // Relay the client's awareness data
            });
          } catch (error) {
            console.error('Error handling awareness update:', error);
          }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
          console.log(`Socket ${socket.id} disconnected from doc ${docId}`);
          this.clients.get(docId)?.delete(socket);
          
          // Remove from awareness
          awareness.removeLocalStateField('user');
          awareness.removeLocalStateField('cursor');
          
          // Broadcast user left
          socket.to(docId).emit('user-left', { userId: socket.id });

          // Clean up if no clients left (with delay to allow reconnection)
          if (this.clients.get(docId)?.size === 0) {
            setTimeout(() => {
              if (this.clients.get(docId)?.size === 0) {
                console.log(`Cleaning up doc ${docId} (no clients)`);
                // Save final state before cleanup
                this.persistence.saveDocument(docId, doc).catch(console.error);
                this.documents.delete(docId);
                this.awareness.delete(docId);
                this.clients.delete(docId);
                const timer = this.saveDebounceTimers.get(docId);
                if (timer) {
                  clearTimeout(timer);
                  this.saveDebounceTimers.delete(docId);
                }
              }
            }, 60000); // 60 second TTL
          }
        });
      });
    });
  }

  /**
   * Debounced save to avoid too frequent writes
   */
  private debouncedSave(docId: string, doc: Y.Doc): void {
    const existing = this.saveDebounceTimers.get(docId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(async () => {
      try {
        await this.persistence.saveDocument(docId, doc);
        console.log(`Saved doc ${docId}`);
      } catch (error) {
        console.error(`Error saving doc ${docId}:`, error);
      }
      this.saveDebounceTimers.delete(docId);
    }, this.SAVE_DEBOUNCE_MS);

    this.saveDebounceTimers.set(docId, timer);
  }

  /**
   * Get document instance (for metadata updates)
   */
  getDocument(docId: string): Y.Doc | undefined {
    return this.documents.get(docId);
  }

  /**
   * Force save a document
   */
  async forceSave(docId: string): Promise<void> {
    const doc = this.documents.get(docId);
    if (doc) {
      const timer = this.saveDebounceTimers.get(docId);
      if (timer) {
        clearTimeout(timer);
        this.saveDebounceTimers.delete(docId);
      }
      await this.persistence.saveDocument(docId, doc);
    }
  }
}

