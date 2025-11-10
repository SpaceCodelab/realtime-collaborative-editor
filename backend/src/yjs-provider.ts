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
        try {
          // Validate data
          if (!data || !data.docId || !data.username || !data.color) {
            console.error(`Invalid join-doc data from socket ${socket.id}:`, data);
            return;
          }

          const { docId, username, color } = data;
          
          // If socket is already in a different document, leave it first
          const currentDocId = (socket as any).docId;
          if (currentDocId && currentDocId !== docId) {
            socket.leave(currentDocId);
            this.clients.get(currentDocId)?.delete(socket);
          }

          // If socket is already in this document, remove old listeners first
          if (currentDocId === docId) {
            socket.removeAllListeners('sync-step2');
            socket.removeAllListeners('doc-update');
            socket.removeAllListeners('awareness-update');
            console.log(`Socket ${socket.id} re-joining doc ${docId} as ${username}`);
          } else {
            console.log(`Socket ${socket.id} joining doc ${docId} as ${username}`);
          }

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

          // Send current awareness state to the new client
          // Note: Awareness states are managed per-client, so we send all current states
          const awarenessState = awareness.getStates();
          if (awarenessState.size > 0) {
            socket.emit('awareness-update', {
              docId,
              data: Array.from(awarenessState.entries()),
            });
          }

          // Broadcast user joined
          socket.to(docId).emit('user-joined', userInfo);

          // Handle sync step 2 (client sends their state vector, we send missing updates)
          // Use once() or check if already registered to avoid duplicate handlers
          const syncStep2Handler = async (data: { docId: string; data: Uint8Array }) => {
            if (!data || data.docId !== docId) return;
            try {
              const stateVector = data.data;
              const update = Y.encodeStateAsUpdate(doc, stateVector);
              socket.emit('sync-update', { docId, data: update });
            } catch (error) {
              console.error('Error handling sync-step2:', error);
            }
          };
          socket.off('sync-step2', syncStep2Handler); // Remove old handler if exists
          socket.on('sync-step2', syncStep2Handler);

          // Handle document updates from client
          const docUpdateHandler = async (data: { docId: string; data: Uint8Array }) => {
            if (!data || data.docId !== docId) return;
            try {
              const update = data.data instanceof Uint8Array ? data.data : new Uint8Array(data.data);
              console.log(`Backend: Received doc-update from ${socket.id} for doc ${docId}, broadcasting to others`);
              Y.applyUpdate(doc, update);
              // Broadcast to other clients in the room (excluding sender)
              socket.to(docId).emit('doc-update', { docId, data: update });
              // Persist with debounce
              this.debouncedSave(docId, doc);
            } catch (error) {
              console.error('Error applying update:', error);
            }
          };
          socket.off('doc-update', docUpdateHandler); // Remove old handler if exists
          socket.on('doc-update', docUpdateHandler);

          // Handle awareness updates from client
          const awarenessUpdateHandler = (data: { docId: string; data: any }) => {
            if (!data || data.docId !== docId) return;
            try {
              // The client sends their local awareness state as [clientId, state]
              // We need to relay it to all other clients in the room
              if (data.data && Array.isArray(data.data)) {
                // Broadcast awareness update to all other clients in the room (excluding sender)
                // The awareness protocol will handle merging on the client side
                socket.to(docId).emit('awareness-update', {
                  docId,
                  data: data.data, // Relay the client's awareness data
                });
              }
            } catch (error) {
              console.error('Error handling awareness update:', error);
            }
          };
          socket.off('awareness-update', awarenessUpdateHandler); // Remove old handler if exists
          socket.on('awareness-update', awarenessUpdateHandler);

        } catch (error) {
          console.error(`Error handling join-doc for socket ${socket.id}:`, error);
        }
      });

      // Handle disconnect (only register once per socket, not per join-doc)
      socket.on('disconnect', () => {
        const docId = (socket as any).docId;
        if (!docId) return;
        
        console.log(`Socket ${socket.id} disconnected from doc ${docId}`);
        this.clients.get(docId)?.delete(socket);
        
        // Get awareness for this doc
        const awareness = this.awareness.get(docId);
        if (awareness) {
          // Remove from awareness
          awareness.removeLocalStateField('user');
          awareness.removeLocalStateField('cursor');
        }
        
        // Broadcast user left
        socket.to(docId).emit('user-left', { userId: socket.id });

        // Clean up if no clients left (with delay to allow reconnection)
        if (this.clients.get(docId)?.size === 0) {
          setTimeout(() => {
            if (this.clients.get(docId)?.size === 0) {
              console.log(`Cleaning up doc ${docId} (no clients)`);
              const doc = this.documents.get(docId);
              if (doc) {
                // Save final state before cleanup
                this.persistence.saveDocument(docId, doc).catch(console.error);
              }
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

