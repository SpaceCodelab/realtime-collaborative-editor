import { Router, Request, Response } from 'express';
import { DocumentPersistence } from './persistence';
import { YjsSocketProvider } from './yjs-provider';

export function createRoutes(persistence: DocumentPersistence, yjsProvider: YjsSocketProvider): Router {
  const router = Router();

  // Get document metadata
  router.get('/api/doc/:docId', async (req: Request, res: Response) => {
    try {
      const { docId } = req.params;
      const metadata = await persistence.getMetadata(docId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json(metadata);
    } catch (error) {
      console.error('Error getting document metadata:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create or update document metadata
  router.post('/api/doc/:docId', async (req: Request, res: Response) => {
    try {
      const { docId } = req.params;
      const { title } = req.body;
      
      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Title is required' });
      }

      const lastModified = Date.now();
      await persistence.saveMetadata(docId, { title, lastModified });
      
      res.json({
        docId,
        title,
        lastModified,
      });
    } catch (error) {
      console.error('Error saving document metadata:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Health check
  router.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  return router;
}

