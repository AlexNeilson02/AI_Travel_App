import { pgTable, text, serial, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
});

// Enhanced trips table with more detailed preferences
export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budget: integer("budget").notNull(),
  // Enhanced preferences structure
  preferences: jsonb("preferences").notNull().$type<{
    accommodationType: string[]; // e.g., ["hotel", "hostel", "apartment"]
    activityTypes: string[]; // e.g., ["outdoor", "cultural", "food"]
    activityFrequency: string; // e.g., "relaxed", "moderate", "intense"
    mustSeeAttractions: string[];
    dietaryRestrictions: string[];
    transportationPreferences: string[];
  }>(),
  isActive: boolean("is_active").notNull().default(true),
});

// New table for AI-generated daily itineraries
export const tripDays = pgTable("trip_days", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  date: timestamp("date").notNull(),
  activities: jsonb("activities").notNull().$type<{
    timeSlots: {
      time: string;
      activity: string;
      location: string;
      duration: string;
      notes: string;
      isEdited: boolean;
      url?: string; // Added URL field for activities
      cost: number;
      originalSuggestion?: string;
    }[];
    accommodation: {
      name: string;
      cost: number;
      url?: string;
    };
  }>(),
  aiSuggestions: jsonb("ai_suggestions").notNull().$type<{
    reasoning: string;
    weatherContext?: string;
    alternativeActivities: string[];
  }>(),
  userFeedback: text("user_feedback"),
  isFinalized: boolean("is_finalized").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    firstName: true,
    lastName: true,
    email: true,
  })
  .extend({
    email: z.string().email("Invalid email address"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
  });

export const insertTripSchema = createInsertSchema(trips)
  .pick({
    title: true,
    destination: true,
    budget: true,
    preferences: true,
  })
  .extend({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    preferences: z.object({
      accommodationType: z.array(z.string()),
      activityTypes: z.array(z.string()),
      activityFrequency: z.string(),
      mustSeeAttractions: z.array(z.string()),
      dietaryRestrictions: z.array(z.string()),
      transportationPreferences: z.array(z.string()),
    }),
  });

export const insertTripDaySchema = createInsertSchema(tripDays)
  .pick({
    tripId: true,
    activities: true,
    aiSuggestions: true,
  })
  .extend({
    date: z.string().transform((str) => new Date(str)),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type TripDay = typeof tripDays.$inferSelect;
export type InsertTripDay = z.infer<typeof insertTripDaySchema>;