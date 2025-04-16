import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTripSchema, updateUserProfileSchema, updateUserPasswordSchema } from "@shared/schema";
import { generateTripSuggestions, generateFollowUpQuestion } from "./openai";
import { format } from "date-fns";
import { getWeatherForecast, suggestAlternativeActivities } from "./weather";
import subscriptionRoutes from "./subscription-routes";
import { comparePasswords, hashPassword } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  
  // Mount subscription routes
  app.use('/api/subscriptions', subscriptionRoutes);

  app.post("/api/trips", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    console.log('Received trip creation request:', req.body);

    // Ensure the request body has proper defaults for accommodation and meals
    const requestBody = {
      ...req.body,
      itinerary: req.body.itinerary ? {
        days: req.body.itinerary.days.map((day: any) => ({
          ...day,
          accommodation: day.accommodation || {
            name: "TBD",
            cost: 0,
            totalCost: 0,
            location: ""
          },
          meals: day.meals || {
            budget: 0,
            totalBudget: 0
          }
        }))
      } : undefined
    };

    try {
      const tripData = insertTripSchema.parse(requestBody);
      console.log('Parsed trip data:', tripData);
      const trip = await storage.createTrip(req.user.id, tripData);
      console.log('Created trip:', trip);
      res.status(201).json(trip);
    } catch (error) {
      console.error('Validation error:', error);
      res.status(400).json({ error: 'Invalid trip data' });
    }
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
    // Allow non-authenticated users to get trip suggestions
    const { destination, preferences, budget, startDate, endDate, numberOfPeople, chatHistory } = req.body;
    console.log('Received suggestions request:', { destination, preferences, budget, startDate, endDate });

    try {
      // Format preferences into array of strings
      const formattedPreferences = [
        ...(preferences.accommodationType || []).map((type: string) => `Accommodation: ${type}`),
        ...(preferences.activityTypes || []).map((type: string) => `Activity: ${type}`),
        `Activity Frequency: ${preferences.activityFrequency || 'moderate'}`,
        ...(preferences.mustSeeAttractions || []).map((attraction: string) => `Must See: ${attraction}`),
        ...(preferences.dietaryRestrictions || []).map((restriction: string) => `Dietary: ${restriction}`),
        ...(preferences.transportationPreferences || []).map((pref: string) => `Transportation: ${pref}`)
      ];

      const response = await generateTripSuggestions(
        destination,
        formattedPreferences,
        budget,
        Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1,
        startDate,
        endDate,
        numberOfPeople,
        chatHistory
      );

      res.json(response);
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      res.status(500).json({
        message: error.message || 'Failed to generate trip suggestions',
        error: error.toString()
      });
    }
  });

  app.post("/api/trip-questions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { preferences, destination, chatHistory } = req.body;

    try {
      // Format preferences into array for question generation
      const formattedPreferences = [
        ...(preferences.accommodationType || []).map((type: string) => `Accommodation: ${type}`),
        ...(preferences.activityTypes || []).map((type: string) => `Activity: ${type}`),
        `Activity Frequency: ${preferences.activityFrequency || 'moderate'}`,
        ...(preferences.mustSeeAttractions || []).map((attraction: string) => `Must See: ${attraction}`),
        ...(preferences.dietaryRestrictions || []).map((restriction: string) => `Dietary: ${restriction}`),
        ...(preferences.transportationPreferences || []).map((pref: string) => `Transportation: ${pref}`)
      ];

      const question = await generateFollowUpQuestion(
        destination,
        formattedPreferences,
        chatHistory
      );

      res.json({ question });
    } catch (error: any) {
      console.error('Error generating question:', error);
      res.status(500).json({
        message: error.message || 'Failed to generate follow-up question',
        error: error.toString()
      });
    }
  });

  // Weather API endpoint
  app.get("/api/weather", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { location, date } = req.query;
    
    if (!location || !date) {
      return res.status(400).json({
        error: "Missing required parameters: location and date"
      });
    }

    try {
      const weatherDate = new Date(date as string);
      const weatherData = await getWeatherForecast(location as string, weatherDate);
      
      if (!weatherData) {
        return res.status(404).json({
          error: "Could not retrieve weather data for the specified location and date."
        });
      }
      
      res.json(weatherData);
    } catch (error: any) {
      console.error('Error fetching weather data:', error);
      res.status(500).json({
        error: error.message || 'Failed to retrieve weather data'
      });
    }
  });

  // Profile routes
  app.get("/api/profile", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Return user info without sensitive data
    const { password, ...userInfo } = req.user;
    res.json(userInfo);
  });

  // Update user profile
  app.patch("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user.id;
      // Validate profile update data
      const profileData = updateUserProfileSchema.parse(req.body);
      
      // If email is changing, check if it already exists
      if (profileData.email && profileData.email !== req.user.email) {
        const existingUserWithEmail = await storage.getUserByUsername(profileData.email);
        if (existingUserWithEmail) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }
      
      // Update user profile
      const updatedUser = await storage.updateUser(userId, profileData);
      
      // Return updated user without password
      const { password, ...userInfo } = updatedUser;
      res.json(userInfo);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      res.status(400).json({ 
        message: "Failed to update profile", 
        error: error.message || "Validation error" 
      });
    }
  });

  // Update user password
  app.post("/api/profile/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user.id;
      // Validate password data
      const passwordData = updateUserPasswordSchema.parse(req.body);
      
      // Check if current password is correct
      const isCurrentPasswordCorrect = await comparePasswords(
        passwordData.currentPassword, 
        req.user.password
      );
      
      if (!isCurrentPasswordCorrect) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(passwordData.newPassword);
      
      // Update user password
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.json({ message: "Password updated successfully" });
    } catch (error: any) {
      console.error('Error updating password:', error);
      res.status(400).json({ 
        message: "Failed to update password", 
        error: error.message || "Validation error" 
      });
    }
  });

  // Upload profile image (this would normally use a file upload handler, but we'll simulate with a URL)
  app.post("/api/profile/image", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const userId = req.user.id;
      const { profileImageUrl } = req.body;
      
      if (!profileImageUrl) {
        return res.status(400).json({ message: "Profile image URL is required" });
      }
      
      // Update user profile image
      const updatedUser = await storage.updateUser(userId, { profileImageUrl });
      
      // Return updated user without password
      const { password, ...userInfo } = updatedUser;
      res.json(userInfo);
    } catch (error: any) {
      console.error('Error updating profile image:', error);
      res.status(500).json({ message: "Failed to update profile image" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}