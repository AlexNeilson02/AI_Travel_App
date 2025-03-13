import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTripSchema, insertTripDaySchema } from "@shared/schema";
import { generateTripSuggestions, getTripRefinementQuestions } from "./openai";
import { addDays, format } from "date-fns";
import { getWeatherForecast, suggestAlternativeActivities } from "./weather";

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

  // Get popular destinations
  app.get("/api/popular-destinations", async (req, res) => {
    try {
      // Get destinations from recent trips
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

  // Trip Days routes
  app.post("/api/trips/:tripId/days", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const tripId = parseInt(req.params.tripId);
    const trip = await storage.getTrip(tripId);
    if (!trip || trip.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const tripDayData = insertTripDaySchema.parse(req.body);

    // Check weather for outdoor activities
    // If destination is a country name, try to use a major city instead for weather data
    const location = trip.destination;
    let weatherLocation = location;
    // Check if location is likely a country
    if (location && !location.includes(",") && /^[A-Z][a-z]+$/.test(location)) {
      const countryCapitals: Record<string, string> = {
        "Germany": "Berlin",
        "France": "Paris",
        "Italy": "Rome",
        "Spain": "Madrid",
        "UK": "London",
        "England": "London",
        "USA": "New York",
        "Canada": "Toronto",
        "Australia": "Sydney",
        "Japan": "Tokyo"
      };
      weatherLocation = countryCapitals[location] || location;
    }
    const weatherData = await getWeatherForecast(weatherLocation, new Date(tripDayData.date));
    if (weatherData) {
      const outdoorActivities = tripDayData.activities.timeSlots.filter(slot => 
        slot.isOutdoor || slot.activity.toLowerCase().includes('outdoor')
      );

      const alternativeActs = [];
      for (const activity of outdoorActivities) {
        if (!weatherData.is_suitable_for_outdoor) {
          const alternatives = suggestAlternativeActivities(weatherData, activity.activity);
          alternativeActs.push(...alternatives);
        }
      }

      tripDayData.aiSuggestions = {
        ...tripDayData.aiSuggestions,
        weatherContext: {
          description: weatherData.description,
          temperature: weatherData.temperature,
          precipitation_probability: weatherData.precipitation_probability,
          is_suitable_for_outdoor: weatherData.is_suitable_for_outdoor
        },
        alternativeActivities: alternativeActs
      };
    }

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
    console.log('Received suggestions request:', { destination, preferences, budget, startDate, endDate });

    try {
      const dayCount = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

      // Format preferences into a flat array for the AI
      const formattedPreferences = [
        ...preferences.accommodationType.map(type => `Accommodation: ${type}`),
        ...preferences.activityTypes.map(type => `Activity: ${type}`),
        `Activity Frequency: ${preferences.activityFrequency}`,
        ...preferences.mustSeeAttractions.map(attraction => `Must See: ${attraction}`),
        ...preferences.dietaryRestrictions.map(restriction => `Dietary: ${restriction}`),
        ...preferences.transportationPreferences.map(pref => `Transportation: ${pref}`)
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

      // Format the suggestions with proper dates and check weather
      const formattedSuggestions = {
        ...suggestions,
        days: await Promise.all(suggestions.days.map(async (day: any, index: number) => {
          const date = addDays(new Date(startDate), index);
          const weatherData = await getWeatherForecast(destination, date);

          // Check if any activities are outdoor and suggest alternatives if needed
          let alternativeActivities: string[] = [];
          if (weatherData) {
            for (const activity of day.activities) {
              if (activity.name.toLowerCase().includes('outdoor') && !weatherData.is_suitable_for_outdoor) {
                alternativeActivities = suggestAlternativeActivities(weatherData, activity.name);
                break;
              }
            }
          }

          return {
            ...day,
            date: format(date, 'yyyy-MM-dd'),
            dayOfWeek: format(date, 'EEEE'),
            weatherContext: weatherData ? {
              description: weatherData.description,
              temperature: weatherData.temperature,
              precipitation_probability: weatherData.precipitation_probability,
              is_suitable_for_outdoor: weatherData.is_suitable_for_outdoor
            } : undefined,
            alternativeActivities
          };
        }))
      };

      console.log('Sending formatted suggestions:', formattedSuggestions);
      res.json(formattedSuggestions);
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