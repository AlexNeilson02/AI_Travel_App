import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTripSchema } from "@shared/schema";
import { generateTripSuggestions } from "./openai";
import { format } from "date-fns";
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

    const { destination, preferences, budget, startDate, endDate, numberOfPeople, chatHistory } = req.body;
    console.log('Received suggestions request:', { destination, preferences, budget, startDate, endDate });

    try {
      // Calculate the exact number of days including both start and end date
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dayCount = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      console.log('Trip duration:', { dayCount, startDate, endDate });

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
        endDate,
        numberOfPeople,
        chatHistory
      );

      console.log('Raw AI suggestions:', suggestions);

      if (!suggestions || !suggestions.days) {
        throw new Error('Failed to generate trip suggestions');
      }

      // Validate that the itinerary includes all days from startDate to endDate
      console.log('Validating itinerary dates...');
      const parsedStartDate = new Date(startDate);
      const parsedEndDate = new Date(endDate);
      const expectedDays = [];

      for (let d = new Date(parsedStartDate); d <= parsedEndDate; d.setDate(d.getDate() + 1)) {
        expectedDays.push(d.toISOString().split("T")[0]); // Store dates in YYYY-MM-DD format
      }

      const aiGeneratedDates = suggestions.days.map((day: any) => day.date);
      const missingDates = expectedDays.filter(date => !aiGeneratedDates.includes(date));

      if (missingDates.length > 0) {
        console.warn(`Missing itinerary dates: ${missingDates.join(", ")}`);

        // Add missing dates with placeholders
        for (const date of missingDates) {
          suggestions.days.push({
            day: suggestions.days.length + 1,
            date: date,
            dayOfWeek: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
            activities: [],
            accommodation: null,
            meals: { budget: 0, totalBudget: 0 },
          });
        }

        // Sort itinerary by date
        suggestions.days.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }

      // Format each day with weather data and proper structure
      const formattedDays = await Promise.all(suggestions.days.map(async (day: any) => {
        const dayDate = new Date(day.date);
        const weatherData = await getWeatherForecast(destination, dayDate);

        // Ensure activities is always an array
        const rawActivities = Array.isArray(day.activities) ? day.activities :
                            day.activities?.timeSlots ? day.activities.timeSlots : [];

        // Format activities into the expected structure
        const formattedActivities = rawActivities.map((activity: any) => {
          if (typeof activity === 'string') {
            return {
              time: "TBD",
              activity: activity,
              location: "",
              duration: "2 hours",
              cost: 0,
              totalCost: 0,
              notes: "",
              isEdited: false,
              isOutdoor: activity.toLowerCase().includes('outdoor')
            };
          }
          return {
            time: activity.time || "TBD",
            activity: activity.activity || activity.name || "",
            location: activity.location || "",
            duration: activity.duration || "2 hours",
            cost: activity.cost || 0,
            totalCost: (activity.cost || 0) * numberOfPeople,
            notes: activity.notes || "",
            isEdited: false,
            url: activity.url,
            originalSuggestion: activity.activity || activity.name,
            isOutdoor: activity.isOutdoor || false
          };
        });

        // Check for weather impact on outdoor activities
        let alternativeActivities: string[] = [];
        if (weatherData && !weatherData.is_suitable_for_outdoor) {
          const outdoorActivities = formattedActivities.filter((activity: any) =>
            activity.isOutdoor || activity.activity.toLowerCase().includes('outdoor')
          );
          for (const activity of outdoorActivities) {
            const alternatives = suggestAlternativeActivities(weatherData, activity.activity);
            alternativeActivities.push(...alternatives);
          }
        }

        return {
          date: format(dayDate, 'yyyy-MM-dd'),
          dayOfWeek: format(dayDate, 'EEEE'),
          activities: {
            timeSlots: formattedActivities
          },
          accommodation: {
            name: day.accommodation?.name || "TBD",
            cost: day.accommodation?.cost || 0,
            totalCost: (day.accommodation?.cost || 0) * numberOfPeople,
            url: day.accommodation?.url || null,
            location: day.accommodation?.location || ""
          },
          meals: {
            budget: day.meals?.budget || 0,
            totalBudget: (day.meals?.budget || 0) * numberOfPeople
          },
          aiSuggestions: {
            reasoning: day.reasoning || "",
            weatherContext: weatherData ? {
              description: weatherData.description,
              temperature: weatherData.temperature,
              precipitation_probability: weatherData.precipitation_probability,
              is_suitable_for_outdoor: weatherData.is_suitable_for_outdoor
            } : undefined,
            alternativeActivities: alternativeActivities
          },
          isFinalized: false
        };
      }));

      const response = {
        title: destination,
        destination,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        budget,
        preferences,
        totalCost: suggestions.totalCost || 0,
        perPersonCost: suggestions.perPersonCost || (suggestions.totalCost / numberOfPeople) || 0,
        days: formattedDays,
        suggestions: {
          days: formattedDays,
          tips: suggestions.tips || []
        }
      };

      console.log('Sending formatted response:', response);
      res.json(response);
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({
        message: error.message || 'Failed to generate trip suggestions',
        error: error.toString()
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}