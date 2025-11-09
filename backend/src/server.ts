import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { DocumentPersistence } from './persistence';
import { YjsSocketProvider } from './yjs-provider';
import { createRoutes } from './routes';

const PORT = process.env.PORT || 3001;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;

const app = express();
const httpServer = createServer(app);

// Socket.io setup with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: `http://localhost:${FRONTEND_PORT}`,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: `http://localhost:${FRONTEND_PORT}`,
  credentials: true,
}));
app.use(express.json());

// Initialize persistence
const persistence = new DocumentPersistence('./data');

// Initialize Yjs provider
const yjsProvider = new YjsSocketProvider(io, persistence);

// API routes
app.use(createRoutes(persistence, yjsProvider));

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing...');
  await persistence.close();
  httpServer.close();
  process.exit(0);
});

httpServer.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Socket.io server ready`);
});

