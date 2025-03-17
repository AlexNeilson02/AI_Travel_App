import { db } from "./db";
import { users, trips, type User, type InsertUser, type Trip, type InsertTrip } from "@shared/schema";
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

      const defaultImages: Record<string, string> = {
        "Greece": "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1000",
        "Italy": "https://images.unsplash.com/photo-1534445867742-43195f401b6c?q=80&w=1000",
        "Japan": "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=1000",
        "France": "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=1000",
        "Spain": "https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?q=80&w=1000",
        "Thailand": "https://images.unsplash.com/photo-1528181304800-259b08848526?q=80&w=1000",
        "Germany": "https://images.unsplash.com/photo-1554072675-d8dc9b6c954f?q=80&w=1000",
        "UK": "https://images.unsplash.com/photo-1520986606214-8b456906c813?q=80&w=1000",
      };

      const destinationImages: Record<string, string> = {
        "El Salvador": "https://images.unsplash.com/photo-1593053272490-a7abac40dbbd?q=80&w=1000",
        "Mexico": "https://images.unsplash.com/photo-1518638150340-f706e86654de?q=80&w=1000",
        "Brazil": "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=1000",
        "Costa Rica": "https://images.unsplash.com/photo-1518259102261-b40117eabbc9?q=80&w=1000",
        "Peru": "https://images.unsplash.com/photo-1526392060635-9d6019884377?q=80&w=1000",
        "Colombia": "https://images.unsplash.com/photo-1567748534085-467f8a8a475d?q=80&w=1000",
        "Argentina": "https://images.unsplash.com/photo-1612294037637-ec328d0e075e?q=80&w=1000",
        "Chile": "https://images.unsplash.com/photo-1544585424-0fb2b5280a82?q=80&w=1000"
      };

      const popularDestinations = Object.entries(destinationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, count]) => ({
          name,
          count,
          image: destinationImages[name] || `https://source.unsplash.com/1600x900/?${encodeURIComponent(name)},landmark`,
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