import { getDb } from "./db";

/**
 * Format SQLite row into camelCase JavaScript plant object.
 */
const formatPlantRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    category: row.category,
    photoUri: row.photo_uri,
    wateringIntervalDays: row.watering_interval_days,
    lastWateredDate: row.last_watered_date,
    nextWaterDate: row.next_water_date,
  };
};

/**
 * Retrieve all saved plants from SQLite database.
 * @returns {Promise<Array>} Array of plant objects
 */
export const getPlants = async () => {
  try {
    const db = getDb();
    const rows = await db.getAllAsync("SELECT * FROM plants ORDER BY name ASC");
    return rows.map(formatPlantRow);
  } catch (error) {
    console.error("Error getting plants from SQLite:", error);
    return [];
  }
};

/**
 * Save/Replace an array of plant objects in SQLite database.
 * @param {Array} plantsArray 
 */
export const savePlants = async (plantsArray) => {
  try {
    const db = getDb();
    await db.execAsync("DELETE FROM plants");
    for (const plant of plantsArray) {
      await db.runAsync(
        `INSERT OR REPLACE INTO plants 
        (id, name, species, category, photo_uri, watering_interval_days, last_watered_date, next_water_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plant.id,
          plant.name,
          plant.species || null,
          plant.category || null,
          plant.photoUri || null,
          plant.wateringIntervalDays || 7,
          plant.lastWateredDate || null,
          plant.nextWaterDate || null,
        ]
      );
    }
  } catch (error) {
    console.error("Error saving plants to SQLite:", error);
  }
};

/**
 * Add a new plant object to SQLite database.
 * @param {Object} plant 
 * @returns {Promise<Array>} Updated array of plant objects
 */
export const addPlant = async (plant) => {
  try {
    const db = getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO plants 
      (id, name, species, category, photo_uri, watering_interval_days, last_watered_date, next_water_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plant.id || Date.now().toString(),
        plant.name,
        plant.species || null,
        plant.category || null,
        plant.photoUri || null,
        plant.wateringIntervalDays || 7,
        plant.lastWateredDate || new Date().toISOString(),
        plant.nextWaterDate || new Date().toISOString(),
      ]
    );
    return await getPlants();
  } catch (error) {
    console.error("Error adding plant to SQLite:", error);
    return [];
  }
};

/**
 * Delete a plant and its associated watering logs from SQLite.
 * @param {string} id 
 * @returns {Promise<Array>} Updated array of plant objects
 */
export const deletePlant = async (id) => {
  try {
    const db = getDb();
    await db.runAsync("DELETE FROM watering_logs WHERE plant_id = ?", [id]);
    await db.runAsync("DELETE FROM plants WHERE id = ?", [id]);
    return await getPlants();
  } catch (error) {
    console.error("Error deleting plant from SQLite:", error);
    return [];
  }
};

/**
 * Mark a plant as watered today:
 * Updates last_watered_date and next_water_date on the plant AND inserts a row into watering_logs.
 * @param {string} plantId 
 * @returns {Promise<Array>} Updated array of plant objects
 */
export const markAsWatered = async (plantId) => {
  try {
    const db = getDb();
    const plantRow = await db.getFirstAsync("SELECT * FROM plants WHERE id = ?", [plantId]);
    if (!plantRow) {
      console.warn("Plant not found for markAsWatered:", plantId);
      return await getPlants();
    }

    const intervalDays = plantRow.watering_interval_days || 7;
    const now = new Date();
    const lastWateredDate = now.toISOString();

    const nextDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    const nextWaterDate = nextDate.toISOString();

    // Update plant record
    await db.runAsync(
      `UPDATE plants 
       SET last_watered_date = ?, next_water_date = ? 
       WHERE id = ?`,
      [lastWateredDate, nextWaterDate, plantId]
    );

    // Insert entry into watering_logs table
    const logId = Date.now().toString();
    await db.runAsync(
      `INSERT INTO watering_logs (id, plant_id, watered_on) 
       VALUES (?, ?, ?)`,
      [logId, plantId, lastWateredDate]
    );

    return await getPlants();
  } catch (error) {
    console.error("Error marking plant as watered in SQLite:", error);
    return [];
  }
};

/**
 * Retrieve watering history logs for a specific plant.
 * @param {string} plantId 
 * @returns {Promise<Array>} Array of log records
 */
export const getWateringLogs = async (plantId) => {
  try {
    const db = getDb();
    return await db.getAllAsync(
      "SELECT * FROM watering_logs WHERE plant_id = ? ORDER BY watered_on DESC",
      [plantId]
    );
  } catch (error) {
    console.error("Error getting watering logs from SQLite:", error);
    return [];
  }
};
