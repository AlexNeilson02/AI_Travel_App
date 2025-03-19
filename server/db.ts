import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Ensure we have database credentials
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure the connection pool with proper settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  maxConnections: 10,
  connectionTimeoutMillis: 0,
  idleTimeoutMillis: 0,
  keepAlive: true
});

// Initialize Drizzle with the configured pool
export const db = drizzle(pool, { schema });

// Add connection error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});