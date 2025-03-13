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


// ... existing imports

// Function to get popular destinations from the database
export async function getPopularDestinations() {
  try {
    // Get unique destinations from trips, count them and sort by popularity
    const destinations = await db.query.trips.findMany({
      columns: {
        destination: true,
      },
      orderBy: (trips, { desc }) => [desc(trips.createdAt)],
      limit: 10,
    });

    // Count destinations and get the most popular ones
    const destinationCounts = destinations.reduce((acc, trip) => {
      if (!trip.destination) return acc;
      acc[trip.destination] = (acc[trip.destination] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Sort by count and convert to array of destination objects
    const popularDestinations = Object.entries(destinationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => {
        // Default images for common destinations
        const defaultImages: Record<string, string> = {
          "Greece": "https://images.unsplash.com/photo-1503152394-c571994fd383?q=80&w=1000",
          "Italy": "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1000",
          "Japan": "https://images.unsplash.com/photo-1492571350019-22de08371fd3?q=80&w=1000",
          "France": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000",
          "Spain": "https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=1000",
          "Thailand": "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?q=80&w=1000",
          "Germany": "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1000",
          "UK": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=1000",
        };

        return {
          name,
          count,
          image: defaultImages[name] || "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000",
          description: `${count} trips planned`
        };
      });

    return popularDestinations.length > 0 
      ? popularDestinations 
      : [
          {
            name: "Greece",
            image: "https://images.unsplash.com/photo-1503152394-c571994fd383?q=80&w=1000",
            description: "Ancient ruins and stunning islands"
          },
          {
            name: "Italy",
            image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1000",
            description: "Historic cities and delicious cuisine"
          },
          {
            name: "Japan",
            image: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?q=80&w=1000",
            description: "Blend of tradition and technology"
          }
        ];
  } catch (error) {
    console.error('Error getting popular destinations:', error);
    // Return default destinations if there's an error
    return [
      {
        name: "Greece",
        image: "https://images.unsplash.com/photo-1503152394-c571994fd383?q=80&w=1000",
        description: "Ancient ruins and stunning islands"
      },
      {
        name: "Italy",
        image: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1000",
        description: "Historic cities and delicious cuisine"
      },
      {
        name: "Japan",
        image: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?q=80&w=1000",
        description: "Blend of tradition and technology"
      }
    ];
  }
}

export const storage = new DatabaseStorage();