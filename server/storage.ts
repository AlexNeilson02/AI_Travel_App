import { db } from "./db";
import { users, trips, type User, type InsertUser, type Trip, type InsertTrip } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

const getDestinationImage = (location: string) => {
  const imageMap: Record<string, string> = {
    "El Salvador": "https://images.pexels.com/photos/13059657/pexels-photo-13059657.jpeg",
    "Mexico": "https://images.pexels.com/photos/3879071/pexels-photo-3879071.jpeg",
    "Brazil": "https://images.pexels.com/photos/2868242/pexels-photo-2868242.jpeg",
    "Costa Rica": "https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg",
    "Peru": "https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg",
    "Colombia": "https://images.pexels.com/photos/3889843/pexels-photo-3889843.jpeg",
    "Argentina": "https://images.pexels.com/photos/13294159/pexels-photo-13294159.jpeg",
    "Chile": "https://images.pexels.com/photos/3879160/pexels-photo-3879160.jpeg",
    "United States": "https://images.pexels.com/photos/290386/pexels-photo-290386.jpeg",
    "Canada": "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg",
    "Spain": "https://images.pexels.com/photos/819764/pexels-photo-819764.jpeg",
    "France": "https://images.pexels.com/photos/699466/pexels-photo-699466.jpeg",
    "Italy": "https://images.pexels.com/photos/1797161/pexels-photo-1797161.jpeg",
    "Germany": "https://images.pexels.com/photos/109629/pexels-photo-109629.jpeg",
    "UK": "https://images.pexels.com/photos/460672/pexels-photo-460672.jpeg",
    "Greece": "https://images.pexels.com/photos/1010657/pexels-photo-1010657.jpeg"
  };

  return imageMap[location] || "https://images.pexels.com/photos/2325446/pexels-photo-2325446.jpeg";
};

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createTrip(userId: number, trip: InsertTrip): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>;
  getUserTrips(userId: number): Promise<Trip[]>;
  updateTrip(id: number, trip: Partial<Trip>): Promise<Trip>;
  deleteTrip(id: number): Promise<void>;

  sessionStore: session.Store;
  getPopularDestinations(): Promise<Array<{ name: string; count?: number; image: string; description: string; }>>;
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
      .values({ 
        ...trip, 
        userId, 
        isActive: true,
        itinerary: { days: [] } 
      })
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

  async getPopularDestinations(): Promise<Array<{ name: string; count?: number; image: string; description: string; }>> {
    try {
      const destinations = await db.select().from(trips).where(eq(trips.isActive, true));

      const destinationCounts = destinations.reduce((acc, trip) => {
        if (!trip.destination) return acc;
        acc[trip.destination] = (acc[trip.destination] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const popularDestinations = Object.entries(destinationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({
          name,
          count,
          image: getDestinationImage(name),
          description: `${count} trips planned`
        }));

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
}

export const storage = new DatabaseStorage();