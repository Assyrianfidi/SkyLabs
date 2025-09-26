import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
// Old contact router
// import contactRouter from "./routes/contact.js";
// New contact router with improved validation and error handling
import contactRouter from "./routes/contact.new.js";
import { db } from "./db/index.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // Add your routes here
  app.use('/api/contact', contactRouter);

  // Get all contacts (for admin purposes)
  app.get("/api/contacts", async (_req: Request, res: Response) => {
    try {
      if (!db) {
        throw new Error('Database connection not available');
      }
      const contacts = await db.query.contacts.findMany();
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  // Return the server instance
  return createServer(app);
}
