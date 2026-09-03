import * as SQLite from "expo-sqlite";

let dbInstance = null;
let initPromise = null;

/**
 * Get or open the synchronous SQLite database instance.
 */
export const getDb = () => {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync("plantcare.db");
  }
  return dbInstance;
};

/**
 * Initialize SQLite database tables safely.
 * Returns a cached promise so multiple calls return the same initialization.
 */
export const initDb = async () => {
  if (!initPromise) {
    initPromise = (async () => {
      const db = getDb();
      await db.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS plants (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          species TEXT,
          category TEXT,
          photo_uri TEXT,
          watering_interval_days INTEGER,
          last_watered_date TEXT,
          next_water_date TEXT,
          notification_id TEXT
        );

        CREATE TABLE IF NOT EXISTS watering_logs (
          id TEXT PRIMARY KEY,
          plant_id TEXT,
          watered_on TEXT,
          FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
        );
      `);

      // Safe migration for existing DB instances without notification_id
      try {
        await db.execAsync(
          "ALTER TABLE plants ADD COLUMN notification_id TEXT;"
        );
      } catch (e) {
        // Ignore error if column already exists
      }

      return db;
    })();
  }
  return initPromise;
};

/**
 * Ensure database and tables are ready before running queries.
 */
export const ensureDbReady = async () => {
  return await initDb();
};
