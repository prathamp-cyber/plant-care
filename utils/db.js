import * as SQLite from "expo-sqlite";

let dbInstance = null;

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
 * Initialize SQLite database tables.
 */
export const initDb = async () => {
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
      next_water_date TEXT
    );

    CREATE TABLE IF NOT EXISTS watering_logs (
      id TEXT PRIMARY KEY,
      plant_id TEXT,
      watered_on TEXT,
      FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
    );
  `);
};
