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

export const trips = pgTable("trips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  budget: integer("budget").notNull(),
  preferences: jsonb("preferences").notNull(),
  activities: jsonb("activities").notNull(),
  isActive: boolean("is_active").notNull().default(true),
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
    activities: true,
  })
  .extend({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;