import type { Express } from "express";
import { createServer, type Server } from "http";
import contactRouter from "./routes/contact.js";
import { db } from "./db/index.js";

export async function registerRoutes(app: Express): Promise<Server> {
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
