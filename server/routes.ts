import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertTripSchema, updateUserProfileSchema, updateUserPasswordSchema } from "@shared/schema";
import OpenAI from "openai";
import { generateTripSuggestions, generateFollowUpQuestion } from "./openai";
import { format } from "date-fns";
import { getWeatherForecast, suggestAlternativeActivities } from "./weather";
import subscriptionRoutes from "./subscription-routes";
import { comparePasswords, hashPassword } from "./auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
    } catch (error: any) {
      console.error('Error creating trip:', error);
      
      // Provide detailed error message based on the type of error
      if (error.code === '57P01' || error.message?.includes('connection')) {
        res.status(503).json({ 
          error: "Database connection issue", 
          message: "We're experiencing temporary database connection issues. Please try again in a moment.",
          code: "DB_CONNECTION_ERROR"
        });
      } else if (error.name === 'ZodError' || error.errors) {
        // Validation error
        res.status(400).json({ 
          error: "Invalid trip data", 
          details: error.errors || error.message,
          code: "VALIDATION_ERROR"
        });
      } else {
        res.status(500).json({ 
          error: "Failed to create trip", 
          message: "An unexpected error occurred while creating your trip. Please try again.",
          code: "UNKNOWN_ERROR"
        });
      }
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
  
  app.post("/api/trips/:id/archive", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const tripId = parseInt(req.params.id);
    const trip = await storage.getTrip(tripId);
    if (!trip || trip.userId !== req.user.id) {
      return res.sendStatus(404);
    }
    const archivedTrip = await storage.archiveTrip(tripId);
    res.json(archivedTrip);
  });
  
  app.post("/api/trips/:id/unarchive", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const tripId = parseInt(req.params.id);
    const trip = await storage.getTrip(tripId);
    if (!trip || trip.userId !== req.user.id) {
      return res.sendStatus(404);
    }
    const unarchivedTrip = await storage.unarchiveTrip(tripId);
    res.json(unarchivedTrip);
  });
  
  app.get("/api/trips/archived", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const archivedTrips = await storage.getUserArchivedTrips(req.user.id);
    res.json(archivedTrips);
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
      
      // Log more detailed information for debugging
      if (error.message.includes('parse')) {
        console.error('This appears to be a JSON parsing error from OpenAI');
      }
      
      // Create a more user-friendly error response
      res.status(500).json({
        message: error.message || 'Failed to generate trip suggestions',
        error: error.toString(),
        suggestion: "Please try with a different destination or date range"
      });
    }
  });
  
  // AI Chat for trip planning
  app.post("/api/trips/ai-chat", async (req, res) => {
    // Verify subscription status for premium features
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { message, messages, tripDetails } = req.body;
    console.log('Received AI chat request:', { message });
    
    try {
      // Process the chat history
      const chatHistory = messages || [];
      
      // Format trip details if they exist
      let systemPrompt = "You are Juno AI, a travel planning assistant. Help the user plan their perfect trip by asking questions about their preferences.";
      let plan = null;
      
      // Special case: Check if this is the confirmation message to generate the plan
      const isConfirmationRequest = message.toLowerCase().includes("yes") && 
        (message.toLowerCase().includes("correct") || message.toLowerCase().includes("confirm") || 
         message.toLowerCase().includes("creat") || message.toLowerCase().includes("generat"));
      
      // If we have essential trip details, consider generating a full plan
      if (tripDetails) {
        const { destination, startDate, endDate, budget, numberOfPeople, accommodationType, activityTypes, activityFrequency } = tripDetails;
        
        // Check if we have all required details to create a plan
        const hasEssentialDetails = destination && startDate && endDate && budget && 
                                   accommodationType && activityTypes && activityFrequency;
        
        if (hasEssentialDetails && (tripDetails.confirmed || isConfirmationRequest)) {
          try {
            // Formulate preferences for the AI
            const formattedPreferences = [
              ...(accommodationType || []).map((type: string) => `Accommodation: ${type}`),
              ...(activityTypes || []).map((type: string) => `Activity: ${type}`),
              `Activity Frequency: ${activityFrequency || 'moderate'}`
            ];
            
            // Calculate trip duration
            const duration = Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            console.log(`Generating full itinerary for trip to ${destination}, ${duration} days, budget: $${budget}`);
            
            // Generate a full trip plan
            try {
              plan = await generateTripSuggestions(
                destination,
                formattedPreferences,
                budget,
                duration,
                startDate,
                endDate,
                numberOfPeople || 1,
                chatHistory
              );
              
              console.log("Successfully generated plan:", !!plan);
              
              systemPrompt = `You are Juno AI, a travel planning assistant. 
              The user is planning a trip to ${destination} from ${startDate} to ${endDate} with a budget of $${budget}.
              I've created a full itinerary for them. Let them know that their complete itinerary is ready to review and save. 
              Tell them they can suggest changes or save the trip to their account.`;
            } catch (tripGenError) {
              console.error("Error generating trip suggestions:", tripGenError);
              // Fallback to using OpenAI to generate a response indicating there was an error
              systemPrompt = `You are Juno AI, a travel planning assistant. 
              The user is planning a trip to ${destination} from ${startDate} to ${endDate} with a budget of $${budget}.
              There was an issue generating their complete itinerary. Apologize for the problem and ask them if they'd 
              like to try again. Let them know this shouldn't normally happen.`;
            }
          } catch (error) {
            console.error("Error in AI chat itinerary generation:", error);
            systemPrompt = "You are Juno AI, a travel planning assistant. There was an error generating the itinerary. Apologize and ask if they'd like to try again with their request.";
          }
        }
      }
      
      // Generate a response using OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: message }
        ],
        temperature: 0.7,
      });
      
      const responseText = response.choices[0].message.content || "I'm having trouble understanding. Could you try rephrasing your question?";
      
      // Return the AI response and the plan if generated
      res.json({
        response: responseText,
        plan: plan
      });
    } catch (error: any) {
      console.error('Error in AI chat:', error);
      res.status(500).json({
        message: error.message || 'Failed to process your request',
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