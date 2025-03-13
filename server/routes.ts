import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTripSchema } from "@shared/schema";
import { generateTripSuggestions, getTripRefinementQuestions } from "./openai";
import { addDays, format } from "date-fns";
import { getWeatherForecast, suggestAlternativeActivities } from "./weather";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

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

    console.log('Found trip:', trip);
    res.json(trip);
  });

  app.patch("/api/trips/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const tripId = parseInt(req.params.id);
    const trip = await storage.getTrip(tripId);
    if (!trip || trip.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const updates = req.body;
    const updatedTrip = await storage.updateTrip(tripId, updates);
    res.json(updatedTrip);
  });

  app.get("/api/popular-destinations", async (req, res) => {
    try {
      const popularDestinations = await storage.getPopularDestinations();
      res.json(popularDestinations);
    } catch (error) {
      console.error('Error fetching popular destinations:', error);
      res.status(500).json({ message: "Failed to fetch popular destinations" });
    }
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

    const { destination, preferences, budget, startDate, endDate, chatHistory } = req.body;
    console.log('Received suggestions request:', { destination, preferences, budget, startDate, endDate });

    try {
      const dayCount = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

      const formattedPreferences = [
        ...preferences.accommodationType.map((type: string) => `Accommodation: ${type}`),
        ...preferences.activityTypes.map((type: string) => `Activity: ${type}`),
        `Activity Frequency: ${preferences.activityFrequency}`,
        ...preferences.mustSeeAttractions.map((attraction: string) => `Must See: ${attraction}`),
        ...preferences.dietaryRestrictions.map((restriction: string) => `Dietary: ${restriction}`),
        ...preferences.transportationPreferences.map((pref: string) => `Transportation: ${pref}`)
      ];

      console.log('Formatted preferences:', formattedPreferences);

      const suggestions = await generateTripSuggestions(
        destination,
        formattedPreferences,
        budget,
        dayCount,
        startDate,
        chatHistory
      );

      console.log('Raw AI suggestions:', suggestions);

      const formattedDays = await Promise.all(suggestions.days.map(async (day: any, index: number) => {
        const date = addDays(new Date(startDate), index);
        const weatherData = await getWeatherForecast(destination, date);

        let alternativeActivities: string[] = [];
        // Ensure day.activities exists and has the expected structure
        const activities = day.activities ? (
          Array.isArray(day.activities) ? day.activities : 
          day.activities.timeSlots ? day.activities.timeSlots :
          []
        ) : [];

        if (weatherData && activities.length > 0) {
          const outdoorActivities = activities.filter((slot: any) => {
            const activity = typeof slot === 'string' ? slot : slot.activity;
            const isOutdoor = typeof slot === 'object' ? slot.isOutdoor : false;
            return isOutdoor || (typeof activity === 'string' && activity.toLowerCase().includes('outdoor'));
          });

          for (const activity of outdoorActivities) {
            if (!weatherData.is_suitable_for_outdoor) {
              const activityName = typeof activity === 'string' ? activity : activity.activity;
              const alternatives = suggestAlternativeActivities(weatherData, activityName);
              alternativeActivities.push(...alternatives);
            }
          }
        }

        // Format activities into the expected structure
        const formattedActivities = activities.map((slot: any) => {
          if (typeof slot === 'string') {
            return {
              time: "TBD",
              activity: slot,
              location: "",
              duration: "2 hours",
              notes: "",
              isEdited: false,
              isOutdoor: slot.toLowerCase().includes('outdoor')
            };
          }
          return {
            time: slot.time || "TBD",
            activity: slot.activity || "",
            location: slot.location || "",
            duration: slot.duration || "2 hours",
            notes: slot.notes || "",
            isEdited: false,
            url: slot.url,
            originalSuggestion: slot.activity,
            isOutdoor: slot.isOutdoor || false
          };
        });

        return {
          date: format(date, 'yyyy-MM-dd'),
          activities: {
            timeSlots: formattedActivities
          },
          aiSuggestions: {
            reasoning: day.reasoning || "",
            weatherContext: weatherData ? {
              description: weatherData.description,
              temperature: weatherData.temperature,
              precipitation_probability: weatherData.precipitation_probability,
              is_suitable_for_outdoor: weatherData.is_suitable_for_outdoor
            } : undefined,
            alternativeActivities
          },
          accommodation: day.accommodation || null,
          isFinalized: false
        };
      }));

      // Save the itinerary directly in the trip
      const tripData = {
        title: destination,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        budget,
        preferences,
        itinerary: {
          days: formattedDays
        }
      };

      console.log('Sending formatted suggestions:', tripData);
      res.json(tripData);
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trip-questions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { preferences } = req.body;
    try {
      const flatPreferences = [
        ...preferences.accommodationType.map((type: string) => `Accommodation: ${type}`),
        ...preferences.activityTypes.map((type: string) => `Activity: ${type}`),
        `Activity Frequency: ${preferences.activityFrequency}`,
        ...preferences.mustSeeAttractions.map((attraction: string) => `Must See: ${attraction}`),
        ...preferences.dietaryRestrictions.map((restriction: string) => `Dietary: ${restriction}`),
        ...preferences.transportationPreferences.map((pref: string) => `Transportation: ${pref}`)
      ];

      const question = await getTripRefinementQuestions(flatPreferences);
      res.json({ question });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}