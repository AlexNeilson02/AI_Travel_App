import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTripSchema } from "@shared/schema";
import { generateTripSuggestions } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Trip routes
  app.post("/api/trips", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const tripData = insertTripSchema.parse(req.body);
    const trip = await storage.createTrip(req.user.id, tripData);
    res.status(201).json(trip);
  });

  app.get("/api/trips", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const trips = await storage.getUserTrips(req.user.id);
    res.json(trips);
  });

  app.get("/api/trips/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const trip = await storage.getTrip(parseInt(req.params.id));
    if (!trip || trip.userId !== req.user.id) {
      return res.sendStatus(404);
    }
    res.json(trip);
  });

  app.delete("/api/trips/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const trip = await storage.getTrip(parseInt(req.params.id));
    if (!trip || trip.userId !== req.user.id) {
      return res.sendStatus(404);
    }
    await storage.deleteTrip(trip.id);
    res.sendStatus(204);
  });

  app.post("/api/suggest-trip", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { destination, preferences, budget, duration } = req.body;
    try {
      const suggestions = await generateTripSuggestions(
        destination,
        preferences,
        budget,
        duration
      );
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
