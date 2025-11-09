# Real-Time Collaborative Editor (Google-Docs-lite)

A production-ready real-time collaborative rich-text editor built with React, Yjs (CRDT), Socket.io, and Node.js. Multiple users can edit the same document simultaneously with live cursors, selections, and presence awareness.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript, React-Quill, Yjs, y-protocols/awareness
- **Backend**: Node.js + Express + TypeScript, Socket.io
- **Real-time Sync**: Yjs (CRDT) for conflict-free document merging
- **Transport**: Socket.io for WebSocket communication
- **Persistence**: LevelDB (default) with option to switch to MongoDB

## Features

✅ **Real-time Collaboration**: Multiple users can edit simultaneously with automatic conflict resolution using Yjs CRDT  
✅ **Live Cursors & Selections**: See other users' cursors and text selections in real-time with colored indicators  
✅ **User Presence**: View list of connected users with colored avatars  
✅ **Document Persistence**: Documents are automatically saved to LevelDB (or MongoDB)  
✅ **Multiple Documents**: Support for multiple documents via URL routing (`/doc/:docId`)  
✅ **Rich Text Editing**: Full-featured rich text editor with formatting options  
✅ **Connection Status**: Visual indicators for connection state and last saved time  

## Project Structure

```
├─ backend/
│  ├─ src/
│  │  ├─ server.ts          # Express + Socket.io server
│  │  ├─ yjs-provider.ts    # Yjs document management & Socket.io bridging
│  │  ├─ persistence.ts     # LevelDB persistence layer
│  │  ├─ routes.ts          # REST API routes
│  │  └─ types.ts           # TypeScript types
│  ├─ package.json
│  └─ tsconfig.json
├─ frontend/
│  ├─ src/
│  │  ├─ main.tsx           # React entry point
│  │  ├─ App.tsx            # Router setup
│  │  ├─ EditorPage.tsx     # Main editor page
│  │  ├─ components/
│  │  │  ├─ RichEditor.tsx  # Quill editor with Yjs binding
│  │  │  ├─ PresenceBar.tsx # User presence list
│  │  │  └─ CursorOverlay.tsx # Remote cursor rendering
│  │  └─ services/
│  │     └─ socketProvider.ts # Socket.io + Yjs provider
│  ├─ package.json
│  └─ vite.config.ts
├─ docker-compose.yml       # Docker setup (optional)
└─ README.md
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- (Optional) Docker and Docker Compose

### Installation

1. **Install all dependencies**:
   ```bash
   npm run install:all
   ```
   Or manually:
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

### Running Locally

**Option 1: Run both frontend and backend together** (recommended for development):
```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3001`
- Frontend dev server on `http://localhost:3000`

**Option 2: Run separately**:

Backend:
```bash
cd backend
npm run dev
```

Frontend:
```bash
cd frontend
npm run dev
```

### Testing Multi-Client Editing

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000` in your browser
3. You'll be prompted for a username (or use saved one)
4. A new document will be created automatically, or navigate to `/doc/:docId` for a specific document
5. **Open the same URL in multiple browser tabs/windows** to test collaboration
6. Type in one tab and see changes appear in real-time in other tabs
7. Move your cursor and see it appear as a colored indicator in other tabs

### Example Test Sequence

```bash
# Terminal 1: Start the server
npm run dev

# Browser 1: Open http://localhost:3000/doc/test-doc-123
# Enter username: "Alice"
# Type: "Hello from Alice!"

# Browser 2: Open http://localhost:3000/doc/test-doc-123
# Enter username: "Bob"
# Type: "Hello from Bob!"

# You should see both messages appear in both browsers in real-time
# Cursors and selections should be visible with colored indicators
```

## How It Works

### Yjs CRDT Sync Protocol

1. **Client connects** → Sends `join-doc` with `{ docId, username, color }`
2. **Server responds** → Sends `sync-step1` with document state vector
3. **Client responds** → Sends `sync-step2` with its state vector
4. **Server sends missing updates** → `sync-update` with binary Yjs update
5. **Ongoing updates** → Clients send `doc-update` with binary Yjs updates, server broadcasts to room

### Awareness Protocol

- Clients track their cursor position and selection in local awareness state
- Awareness updates are sent to server via `awareness-update` event
- Server broadcasts awareness updates to all clients in the document room
- Frontend renders remote cursors as colored overlays on the editor

### Persistence

- Documents are persisted to LevelDB in `./data/` directory
- Updates are debounced (1 second) to avoid excessive writes
- On server start, persisted documents are loaded into memory
- Documents are cleaned up from memory after 60 seconds of no clients (but remain persisted)

## Switching to MongoDB

To use MongoDB instead of LevelDB:

1. **Install MongoDB driver**:
   ```bash
   cd backend
   npm install mongodb
   ```

2. **Update `backend/src/persistence.ts`**:
   ```typescript
   import { MongoClient, Db, Collection } from 'mongodb';

   export class DocumentPersistence {
     private client: MongoClient;
     private db: Db;
     private documents: Collection;
     private metadata: Collection;

     constructor(connectionString: string = 'mongodb://localhost:27017') {
       this.client = new MongoClient(connectionString);
       this.db = this.client.db('collaborative-editor');
       this.documents = this.db.collection('documents');
       this.metadata = this.db.collection('metadata');
     }

     async loadDocument(docId: string): Promise<Uint8Array | null> {
       const doc = await this.documents.findOne({ _id: docId });
       return doc ? Buffer.from(doc.data) : null;
     }

     async saveDocument(docId: string, doc: Y.Doc): Promise<void> {
       const update = Y.encodeStateAsUpdate(doc);
       await this.documents.updateOne(
         { _id: docId },
         { $set: { data: Buffer.from(update), updatedAt: new Date() } },
         { upsert: true }
       );
     }

     // ... similar for metadata methods
   }
   ```

3. **Update `backend/src/server.ts`** to pass MongoDB connection string

## Deployment

### Production Build

```bash
npm run build
```

This builds both frontend and backend. The backend will serve the frontend static files in production mode.

### Environment Variables

- `PORT`: Backend server port (default: 3001)
- `FRONTEND_PORT`: Frontend port (default: 3000)
- `NODE_ENV`: Set to `production` for production mode
- `VITE_SOCKET_URL`: Frontend Socket.io URL (default: `http://localhost:3001`)

### Docker Deployment

```bash
docker-compose up -d
```

This starts both backend and frontend containers. Make sure to set `VITE_SOCKET_URL` in `docker-compose.yml` to your backend URL.

### Heroku Deployment

1. Create a Heroku app
2. Set buildpacks: Node.js
3. Set environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   ```
4. Deploy:
   ```bash
   git push heroku main
   ```

### Vercel + Node Server

- Frontend: Deploy to Vercel (static export)
- Backend: Deploy to Railway, Render, or similar Node.js hosting
- Update `VITE_SOCKET_URL` to point to your backend URL

## API Endpoints

- `GET /api/doc/:docId` - Get document metadata
- `POST /api/doc/:docId` - Create/update document metadata
- `GET /api/health` - Health check

## Socket.io Events

**Client → Server**:
- `join-doc` - Join a document room
- `sync-step2` - Send state vector for sync
- `doc-update` - Send document update
- `awareness-update` - Send awareness state

**Server → Client**:
- `sync-step1` - Initial state vector
- `sync-update` - Missing document updates
- `doc-update` - Document update from another client
- `awareness-update` - Awareness state from other clients
- `user-joined` - User joined notification
- `user-left` - User left notification

## Code Comments

Key implementation details are commented in:
- `backend/src/yjs-provider.ts` - Yjs sync protocol and awareness handling
- `frontend/src/services/socketProvider.ts` - Client-side Yjs provider
- `frontend/src/components/CursorOverlay.tsx` - Remote cursor rendering

## Troubleshooting

**Connection issues**: Check that backend is running on port 3001 and frontend can reach it  
**Cursors not showing**: Ensure awareness updates are being sent/received (check browser console)  
**Changes not syncing**: Verify Yjs document updates are being applied (check server logs)  
**Persistence not working**: Ensure `./data/` directory is writable

## License

MIT

## Alternative: Using y-websocket

For a simpler setup, you could use the official `y-websocket` provider instead of the custom Socket.io provider. However, this implementation uses a custom provider for better control and Socket.io integration.

To use `y-websocket`:
```bash
npm install y-websocket
```

Then replace the Socket.io provider with `y-websocket` in the frontend.

