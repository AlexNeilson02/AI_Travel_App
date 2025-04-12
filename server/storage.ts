import { db } from "./db";
import { 
  users, 
  trips, 
  subscriptionPlans, 
  userSubscriptions,
  type User, 
  type InsertUser, 
  type Trip, 
  type InsertTrip,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type UserSubscription,
  type InsertUserSubscription
} from "@shared/schema";
import { eq, and, sql, desc, lt, gte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  createTrip(userId: number, trip: InsertTrip): Promise<Trip>;
  getTrip(id: number): Promise<Trip | undefined>;
  getUserTrips(userId: number): Promise<Trip[]>;
  updateTrip(id: number, trip: Partial<Trip>): Promise<Trip>;
  deleteTrip(id: number): Promise<void>;
  getPopularDestinations(): Promise<string[]>;
  
  // Subscription Plan Methods
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  updateSubscriptionPlan(id: number, plan: Partial<SubscriptionPlan>): Promise<SubscriptionPlan>;
  
  // User Subscription Methods
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  getUserSubscription(userId: number): Promise<UserSubscription | undefined>;
  getUserActiveSubscription(userId: number): Promise<UserSubscription | undefined>;
  updateUserSubscription(id: number, subscription: Partial<UserSubscription>): Promise<UserSubscription>;
  cancelUserSubscription(userId: number): Promise<UserSubscription>;
  
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

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    return user;
  }

  async createTrip(userId: number, trip: InsertTrip): Promise<Trip> {
    // Prepare itinerary data with proper structure
    const itinerary = trip.itinerary || { days: [] };
    
    // Validate itinerary structure before saving
    if (itinerary.days) {
      itinerary.days = itinerary.days.map(day => ({
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
        },
        weatherContext: day.weatherContext,
        activities: {
          timeSlots: (day.activities?.timeSlots || []).map(slot => ({
            ...slot,
            cost: slot.cost || 0,
            totalCost: slot.totalCost || 0
          }))
        },
        isFinalized: day.isFinalized || false
      }));
    }

    // Create a plain object with all the trip fields explicitly
    const tripData = {
      userId,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate,
      endDate: trip.endDate,
      budget: trip.budget,
      currency: 'USD', // Default currency
      preferences: trip.preferences,
      itinerary,
      isActive: true
    };

    // Insert a single trip (not an array)
    const [newTrip] = await db
      .insert(trips)
      .values([tripData]) // Wrap in array to satisfy the type
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
    const currentTrip = await this.getTrip(id);
    if (!currentTrip) {
      throw new Error("Trip not found");
    }

    // Ensure we're properly merging itinerary data
    const updatedItinerary = tripUpdate.itinerary ? {
      days: tripUpdate.itinerary.days.map(day => ({
        ...day,
        accommodation: day.accommodation || currentTrip.itinerary?.days.find(d => d.date === day.date)?.accommodation || {
          name: "TBD",
          cost: 0,
          totalCost: 0,
          location: ""
        },
        meals: day.meals || currentTrip.itinerary?.days.find(d => d.date === day.date)?.meals || {
          budget: 0,
          totalBudget: 0
        },
        weatherContext: day.weatherContext || currentTrip.itinerary?.days.find(d => d.date === day.date)?.weatherContext
      }))
    } : currentTrip.itinerary;

    const updatedTrip = {
      ...tripUpdate,
      itinerary: updatedItinerary
    };

    const [result] = await db
      .update(trips)
      .set(updatedTrip)
      .where(eq(trips.id, id))
      .returning();

    if (!result) {
      throw new Error("Trip not found");
    }

    return result;
  }

  async deleteTrip(id: number): Promise<void> {
    await this.updateTrip(id, { isActive: false });
  }

  async getPopularDestinations(): Promise<string[]> {
    const destinations = await db
      .select({
        destination: trips.destination,
        count: sql`count(*)`.as('count')
      })
      .from(trips)
      .where(eq(trips.isActive, true))
      .groupBy(trips.destination)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    return destinations.map(d => d.destination);
  }

  // Subscription Plan Methods
  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    // Explicitly create a new object matching the required schema
    const planData = {
      name: plan.name,
      description: plan.description,
      stripePriceId: plan.stripePriceId,
      monthlyPrice: plan.monthlyPrice,
      features: plan.features,
      maxTrips: plan.maxTrips,
      isActive: plan.isActive !== undefined ? plan.isActive : true
    };
    
    const [newPlan] = await db
      .insert(subscriptionPlans)
      .values([planData]) // Wrap in array to satisfy type
      .returning();
    
    return newPlan;
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(subscriptionPlans.monthlyPrice);
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, id));
    
    return plan;
  }

  async updateSubscriptionPlan(id: number, planUpdate: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const [plan] = await db
      .update(subscriptionPlans)
      .set(planUpdate)
      .where(eq(subscriptionPlans.id, id))
      .returning();
    
    if (!plan) {
      throw new Error("Subscription plan not found");
    }
    
    return plan;
  }

  // User Subscription Methods
  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [newSubscription] = await db
      .insert(userSubscriptions)
      .values(subscription)
      .returning();
    
    return newSubscription;
  }

  async getUserSubscription(userId: number): Promise<UserSubscription | undefined> {
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);
    
    return subscription;
  }

  async getUserActiveSubscription(userId: number): Promise<UserSubscription | undefined> {
    const now = new Date();
    
    // Find subscription that is active (status = 'active') and not expired
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, 'active'),
          gte(userSubscriptions.currentPeriodEnd, now)
        )
      )
      .orderBy(desc(userSubscriptions.currentPeriodEnd))
      .limit(1);
    
    return subscription;
  }

  async updateUserSubscription(id: number, subscriptionUpdate: Partial<UserSubscription>): Promise<UserSubscription> {
    const [subscription] = await db
      .update(userSubscriptions)
      .set({
        ...subscriptionUpdate,
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, id))
      .returning();
    
    if (!subscription) {
      throw new Error("User subscription not found");
    }
    
    return subscription;
  }

  async cancelUserSubscription(userId: number): Promise<UserSubscription> {
    const subscription = await this.getUserActiveSubscription(userId);
    
    if (!subscription) {
      throw new Error("No active subscription found for user");
    }
    
    return await this.updateUserSubscription(subscription.id, {
      cancelAtPeriodEnd: true,
      status: 'canceled'
    });
  }
}

export const storage = new DatabaseStorage();