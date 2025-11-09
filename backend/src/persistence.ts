import { Level } from 'level';
import * as Y from 'yjs';
import path from 'path';

// Simple LevelDB-based persistence for Yjs documents
export class DocumentPersistence {
  private db: Level<string, Uint8Array>;
  private metadataDb: Level<string, string>;

  constructor(dbPath: string = './data') {
    this.db = new Level(path.join(dbPath, 'documents'), {
      valueEncoding: 'binary',
    });
    this.metadataDb = new Level(path.join(dbPath, 'metadata'), {
      valueEncoding: 'json',
    });
  }

  /**
   * Load a persisted document state
   */
  async loadDocument(docId: string): Promise<Uint8Array | null> {
    try {
      const data = await this.db.get(docId);
      return data;
    } catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Save document state as a snapshot
   */
  async saveDocument(docId: string, doc: Y.Doc): Promise<void> {
    const update = Y.encodeStateAsUpdate(doc);
    await this.db.put(docId, update);
  }

  /**
   * Save document metadata
   */
  async saveMetadata(docId: string, metadata: { title: string; lastModified: number; createdAt?: number }): Promise<void> {
    const existing = await this.getMetadata(docId);
    await this.metadataDb.put(docId, JSON.stringify({
      docId,
      title: metadata.title,
      lastModified: metadata.lastModified,
      createdAt: metadata.createdAt || existing?.createdAt || Date.now(),
    }));
  }

  /**
   * Get document metadata
   */
  async getMetadata(docId: string): Promise<{ docId: string; title: string; lastModified: number; createdAt: number } | null> {
    try {
      const data = await this.metadataDb.get(docId);
      return JSON.parse(data);
    } catch (error: any) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.db.close();
    await this.metadataDb.close();
  }
}

