import { db } from "./db";
import { users, trips, type User, type InsertUser, type Trip, type InsertTrip } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createTrip(userId: number, trip: InsertTrip): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>;
  getUserTrips(userId: number): Promise<Trip[]>;
  updateTrip(id: number, trip: Partial<Trip>): Promise<Trip>;
  deleteTrip(id: number): Promise<void>;
  getPopularDestinations(): Promise<Array<{ destination: string; count: number }>>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createTrip(userId: number, trip: InsertTrip): Promise<Trip> {
    // Ensure the itinerary data is properly formatted before saving
    const tripData = {
      ...trip,
      userId,
      isActive: true,
      // Make sure itinerary is properly structured when saving
      itinerary: trip.itinerary || { days: [] }
    };

    const [newTrip] = await db
      .insert(trips)
      .values(tripData)
      .returning();

    return newTrip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, id));
    return trip;
  }

  async getUserTrips(userId: number): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(and(eq(trips.userId, userId), eq(trips.isActive, true)));
  }

  async updateTrip(id: number, tripUpdate: Partial<Trip>): Promise<Trip> {
    const [updatedTrip] = await db
      .update(trips)
      .set({
        ...tripUpdate,
        // Ensure we're not accidentally removing the itinerary
        itinerary: tripUpdate.itinerary || (await this.getTrip(id))?.itinerary
      })
      .where(eq(trips.id, id))
      .returning();

    if (!updatedTrip) {
      throw new Error("Trip not found");
    }

    return updatedTrip;
  }

  async deleteTrip(id: number): Promise<void> {
    await this.updateTrip(id, { isActive: false });
  }

  async getPopularDestinations(): Promise<Array<{ destination: string; count: number }>> {
    const result = await db
      .select({
        destination: trips.destination,
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(trips)
      .where(eq(trips.isActive, true))
      .groupBy(trips.destination)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    return result;
  }
}

export const storage = new DatabaseStorage();