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
  subscriptionTier: text("subscription_tier").notNull().default('free'),
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  stripeCustomerId: text("stripe_customer_id"),
});

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budget: integer("budget").notNull(),
  currency: text("currency").notNull().default('USD'),
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
      dayOfWeek?: string;
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
          cost?: number;
          totalCost?: number;
        }[];
      };
      accommodation: {
        name: string;
        cost: number;
        totalCost: number;
        url?: string | null;
        location: string;
      };
      meals: {
        budget: number;
        totalBudget: number;
      };
      weatherContext?: {
        description: string;
        temperature: number;
        precipitation_probability: number;
        is_suitable_for_outdoor: boolean;
      };
      aiSuggestions?: {
        reasoning: string;
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

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
  monthlyPrice: integer("monthly_price").notNull(),
  features: jsonb("features").$type<string[]>().notNull(),
  maxTrips: integer("max_trips").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  planId: integer("plan_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  status: text("status").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
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
        dayOfWeek: z.string().optional(),
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
            cost: z.number().optional(),
            totalCost: z.number().optional(),
          })),
        }).optional(),
        accommodation: z.object({
          name: z.string(),
          cost: z.number(),
          totalCost: z.number(),
          url: z.string().optional().nullable(),
          location: z.string(),
        }).optional(),
        meals: z.object({
          budget: z.number(),
          totalBudget: z.number(),
        }).optional(),
        weatherContext: z.object({
          description: z.string(),
          temperature: z.number(),
          precipitation_probability: z.number(),
          is_suitable_for_outdoor: z.boolean(),
        }).optional(),
        aiSuggestions: z.object({
          reasoning: z.string(),
          alternativeActivities: z.array(z.string()),
        }).optional(),
        userFeedback: z.string().optional(),
        isFinalized: z.boolean().optional().default(false),
      })),
    }).optional(),
  });

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans)
  .pick({
    name: true,
    description: true,
    stripePriceId: true,
    monthlyPrice: true,
    features: true,
    maxTrips: true,
    isActive: true,
  });

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions)
  .pick({
    userId: true,
    planId: true,
    stripeSubscriptionId: true,
    status: true,
    cancelAtPeriodEnd: true,
  })
  .extend({
    currentPeriodStart: z.coerce.date(),
    currentPeriodEnd: z.coerce.date(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type TripLocation = typeof tripLocations.$inferSelect;
export type InsertTripLocation = z.infer<typeof insertTripLocationSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;