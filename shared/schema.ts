import { pgTable, text, serial, integer, jsonb, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const APP_NAME = "Juno";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budget: integer("budget").notNull(),
  preferences: jsonb("preferences").notNull().$type<{
    accommodationType: string[];
    activityTypes: string[];
    activityFrequency: string;
    mustSeeAttractions: string[];
    dietaryRestrictions: string[];
    transportationPreferences: string[];
  }>(),
  itinerary: jsonb("itinerary").$type<{
    days: {
      date: string;
      activities: {
        timeSlots: {
          time: string;
          activity: string;
          location: string;
          duration: string;
          notes: string;
          isEdited: boolean;
          url?: string;
          originalSuggestion?: string;
          isOutdoor?: boolean;
        }[];
      };
      aiSuggestions: {
        reasoning: string;
        weatherContext?: {
          description: string;
          temperature: number;
          feels_like: number;
          humidity: number;
          wind_speed: number;
          precipitation_probability: number;
          is_suitable_for_outdoor: boolean;
        };
        alternativeActivities: string[];
      };
      userFeedback?: string;
      isFinalized: boolean;
    }[];
  }>(),
  isActive: boolean("is_active").notNull().default(true),
});

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: decimal("latitude").notNull(),
  longitude: decimal("longitude").notNull(),
  placeId: text("place_id").notNull(),
  address: text("address").notNull(),
  type: text("type").notNull(),
  rating: decimal("rating"),
  photos: jsonb("photos").$type<string[]>(),
  openingHours: jsonb("opening_hours").$type<{
    periods: {
      open: { day: number; time: string };
      close: { day: number; time: string };
    }[];
  }>(),
});

export const tripLocations = pgTable("trip_locations", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  locationId: integer("location_id").notNull(),
  visitTime: timestamp("visit_time").notNull(),
  duration: integer("duration").notNull(),
  notes: text("notes"),
  isVisited: boolean("is_visited").notNull().default(false),
});

export const insertLocationSchema = createInsertSchema(locations)
  .pick({
    name: true,
    placeId: true,
    address: true,
    type: true,
  })
  .extend({
    latitude: z.number(),
    longitude: z.number(),
    rating: z.number().optional(),
    photos: z.array(z.string()).optional(),
    openingHours: z.object({
      periods: z.array(
        z.object({
          open: z.object({
            day: z.number(),
            time: z.string(),
          }),
          close: z.object({
            day: z.number(),
            time: z.string(),
          }),
        })
      ),
    }).optional(),
  });

export const insertTripLocationSchema = createInsertSchema(tripLocations)
  .pick({
    tripId: true,
    locationId: true,
    duration: true,
    notes: true,
  })
  .extend({
    visitTime: z.coerce.date(),
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
    itinerary: z.object({
      days: z.array(z.object({
        date: z.string(),
        activities: z.object({
          timeSlots: z.array(z.object({
            time: z.string(),
            activity: z.string(),
            location: z.string(),
            duration: z.string(),
            notes: z.string(),
            isEdited: z.boolean(),
            url: z.string().optional(),
            originalSuggestion: z.string().optional(),
            isOutdoor: z.boolean().optional(),
          })),
        }),
        aiSuggestions: z.object({
          reasoning: z.string(),
          weatherContext: z.object({
            description: z.string(),
            temperature: z.number(),
            feels_like: z.number().optional(),
            humidity: z.number().optional(),
            wind_speed: z.number().optional(),
            precipitation_probability: z.number(),
            is_suitable_for_outdoor: z.boolean(),
          }).optional(),
          alternativeActivities: z.array(z.string()),
        }),
        userFeedback: z.string().optional(),
        isFinalized: z.boolean(),
      })),
    }).optional(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type TripLocation = typeof tripLocations.$inferSelect;
export type InsertTripLocation = z.infer<typeof insertTripLocationSchema>;