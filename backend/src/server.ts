import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { DocumentPersistence } from './persistence';
import { YjsSocketProvider } from './yjs-provider';
import { createRoutes } from './routes';

const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const parseOrigins = (origins?: string | string[]) => {
  if (!origins) return [];
  if (Array.isArray(origins)) return origins;
  return origins.split(',').map(origin => origin.trim()).filter(Boolean);
};

const configuredOrigins = parseOrigins(FRONTEND_ORIGIN);

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Allow non-browser clients (like curl)
  if (configuredOrigins.length > 0) {
    return configuredOrigins.includes(origin);
  }
  // Default development origins
  const defaultAllowed = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173', // Vite preview
    'http://127.0.0.1:4173',
  ];
  return defaultAllowed.includes(origin);
};

const originValidator = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    console.warn(`CORS: blocked origin ${origin}`);
    callback(new Error('Not allowed by CORS'));
  }
};

const app = express();
const httpServer = createServer(app);

// Socket.io setup with CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: originValidator,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: originValidator,
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

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

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

