export interface UserInfo {
  username: string;
  color: string;
  userId: string;
}

export interface DocumentMetadata {
  docId: string;
  title: string;
  lastModified: number;
  createdAt: number;
}

export interface SocketMessage {
  type: string;
  data?: any;
}

export interface JoinDocMessage {
  docId: string;
  username: string;
  color: string;
}

export interface SyncMessage {
  type: 'sync-step1' | 'sync-step2' | 'update' | 'awareness';
  data: Uint8Array;
  docId?: string;
}

