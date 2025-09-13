import type { Express } from "express";
import { createServer, type Server } from "http";
import contactRouter from "./routes/contact.js";
import { db } from "./db/index.js";

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS middleware for all routes
  app.use((_req: any, res: any, next: () => void) => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://skylabs.tech', 'https://skylabs-1.onrender.com']
      : ['http://localhost:3001', 'http://localhost:5173'];
    
    const origin = _req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (_req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });

  // API routes
  app.use("/api/contact", contactRouter);

  // Get all contacts (for admin purposes)
  app.get("/api/contacts", async (_req, res) => {
    try {
      if (!db) {
        throw new Error('Database connection not available');
      }
      const contacts = await db.query.contacts.findMany();
      res.json(contacts);
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to retrieve contacts." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
