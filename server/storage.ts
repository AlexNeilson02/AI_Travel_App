import { db } from "./db";
import { users, trips, tripDays, type User, type InsertUser, type Trip, type InsertTrip, type TripDay, type InsertTripDay } from "@shared/schema";
import { eq, and } from "drizzle-orm";
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

  createTripDay(tripDay: InsertTripDay): Promise<TripDay>;
  getTripDays(tripId: number): Promise<TripDay[]>;
  updateTripDay(id: number, tripDay: Partial<TripDay>): Promise<TripDay>;
  deleteTripDay(id: number): Promise<void>;

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
    const [newTrip] = await db
      .insert(trips)
      .values({ ...trip, userId, isActive: true })
      .returning();
    return newTrip;
  }

  async getTrip(id: number): Promise<Trip | undefined> {
    const [trip] = await db
      .select()
      .from(trips)
      .where(eq(trips.id, id));
    console.log('Retrieved trip from database:', trip);
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
      .set(tripUpdate)
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

  // New methods for trip days
  async createTripDay(tripDay: InsertTripDay): Promise<TripDay> {
    const [newTripDay] = await db
      .insert(tripDays)
      .values(tripDay)
      .returning();
    return newTripDay;
  }

  async getTripDays(tripId: number): Promise<TripDay[]> {
    return await db
      .select()
      .from(tripDays)
      .where(eq(tripDays.tripId, tripId));
  }

  async updateTripDay(id: number, tripDayUpdate: Partial<TripDay>): Promise<TripDay> {
    const [updatedTripDay] = await db
      .update(tripDays)
      .set(tripDayUpdate)
      .where(eq(tripDays.id, id))
      .returning();

    if (!updatedTripDay) {
      throw new Error("Trip day not found");
    }

    return updatedTripDay;
  }

  async deleteTripDay(id: number): Promise<void> {
    await db
      .delete(tripDays)
      .where(eq(tripDays.id, id));
  }
}

export const storage = new DatabaseStorage();