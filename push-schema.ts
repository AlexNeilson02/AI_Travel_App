import { db } from "./server/db";

// Push schema changes to the database
console.log('Pushing schema to database...');

async function main() {
  try {
    // Run a database migration to create new tables
    await db.execute(`CREATE TABLE IF NOT EXISTS subscription_plans (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      stripe_price_id TEXT NOT NULL,
      monthly_price INTEGER NOT NULL,
      features JSONB NOT NULL,
      max_trips INTEGER NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS user_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      stripe_subscription_id TEXT NOT NULL,
      current_period_start TIMESTAMP NOT NULL,
      current_period_end TIMESTAMP NOT NULL,
      status TEXT NOT NULL,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    console.log('Schema successfully pushed to database');
  } catch (error) {
    console.error('Error pushing schema to database:', error);
  }
}

main().then(() => process.exit(0));