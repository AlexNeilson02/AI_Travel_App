import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTripSchema, insertTripDaySchema } from "@shared/schema";
import { generateTripSuggestions, getTripRefinementQuestions } from "./openai";
import { addDays, format } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Trip routes
  app.post("/api/trips", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    console.log('Received trip creation request:', req.body);
    const tripData = insertTripSchema.parse(req.body);
    console.log('Parsed trip data:', tripData);
    const trip = await storage.createTrip(req.user.id, tripData);
    console.log('Created trip:', trip);
    res.status(201).json(trip);
  });

  app.get("/api/trips", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const trips = await storage.getUserTrips(req.user.id);
    res.json(trips);
  });

  app.get("/api/trips/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    console.log('Fetching trip:', req.params.id);
    const trip = await storage.getTrip(parseInt(req.params.id));
    if (!trip || trip.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    // Fetch associated trip days
    const tripDays = await storage.getTripDays(trip.id);
    console.log('Found trip and days:', { trip, tripDays });
    res.json({ ...trip, tripDays });
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

  // Trip Days routes
  app.post("/api/trips/:tripId/days", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const tripId = parseInt(req.params.tripId);
    const trip = await storage.getTrip(tripId);
    if (!trip || trip.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const tripDayData = insertTripDaySchema.parse(req.body);
    const tripDay = await storage.createTripDay(tripDayData);
    res.status(201).json(tripDay);
  });

  app.patch("/api/trips/:tripId/days/:dayId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const tripId = parseInt(req.params.tripId);
    const dayId = parseInt(req.params.dayId);

    const trip = await storage.getTrip(tripId);
    if (!trip || trip.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const updates = req.body;
    const updatedDay = await storage.updateTripDay(dayId, updates);
    res.json(updatedDay);
  });

  // AI Suggestion endpoints
  app.post("/api/suggest-trip", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { destination, preferences, budget, startDate, endDate, chatHistory } = req.body;
    try {
      const dayCount = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      const suggestions = await generateTripSuggestions(
        destination,
        preferences,
        budget,
        dayCount,
        startDate,
        chatHistory
      );

      // Format the suggestions with proper dates
      const formattedSuggestions = {
        ...suggestions,
        days: suggestions.days.map((day: any, index: number) => ({
          ...day,
          date: format(addDays(new Date(startDate), index), 'yyyy-MM-dd'),
          dayOfWeek: format(addDays(new Date(startDate), index), 'EEEE')
        }))
      };

      res.json(formattedSuggestions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trip-questions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { preferences } = req.body;
    try {
      const question = await getTripRefinementQuestions(preferences || []);
      res.json({ question });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}