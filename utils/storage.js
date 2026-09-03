import { getDb, ensureDbReady } from "./db";
import {
  schedulePlantNotification,
  cancelPlantNotification,
} from "./notifications";
import {
  getTodayLocalDateString,
  addDaysToLocalDateString,
} from "./dates";

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
    notificationId: row.notification_id,
  };
};

/**
 * Retrieve all saved plants from SQLite database.
 * @returns {Promise<Array>} Array of plant objects
 */
export const getPlants = async () => {
  try {
    const db = await ensureDbReady();
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
    const db = await ensureDbReady();
    await db.execAsync("DELETE FROM plants");
    for (const plant of plantsArray) {
      const notifId = await schedulePlantNotification(plant);
      await db.runAsync(
        `INSERT OR REPLACE INTO plants 
        (id, name, species, category, photo_uri, watering_interval_days, last_watered_date, next_water_date, notification_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          plant.id,
          plant.name,
          plant.species || null,
          plant.category || null,
          plant.photoUri || null,
          plant.wateringIntervalDays || 7,
          plant.lastWateredDate || getTodayLocalDateString(),
          plant.nextWaterDate || addDaysToLocalDateString(plant.lastWateredDate, plant.wateringIntervalDays || 7),
          notifId || plant.notificationId || null,
        ]
      );
    }
  } catch (error) {
    console.error("Error saving plants to SQLite:", error);
  }
};

/**
 * Add a new plant object to SQLite database and schedule a local watering notification.
 * @param {Object} plant 
 * @returns {Promise<Array>} Updated array of plant objects
 */
export const addPlant = async (plant) => {
  try {
    const db = await ensureDbReady();
    const plantId = plant.id || Date.now().toString();

    const interval = plant.wateringIntervalDays || 7;
    const lastWatered = plant.lastWateredDate
      ? (plant.lastWateredDate.includes("T") ? plant.lastWateredDate.split("T")[0] : plant.lastWateredDate)
      : getTodayLocalDateString();

    const nextWater = plant.nextWaterDate
      ? (plant.nextWaterDate.includes("T") ? plant.nextWaterDate.split("T")[0] : plant.nextWaterDate)
      : addDaysToLocalDateString(lastWatered, interval);

    // Schedule local notification for next_water_date at 9:00 AM
    const notifId = await schedulePlantNotification({
      id: plantId,
      name: plant.name,
      nextWaterDate: nextWater,
      notificationId: plant.notificationId,
    });

    await db.runAsync(
      `INSERT OR REPLACE INTO plants 
      (id, name, species, category, photo_uri, watering_interval_days, last_watered_date, next_water_date, notification_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        plantId,
        plant.name,
        plant.species || null,
        plant.category || null,
        plant.photoUri || null,
        interval,
        lastWatered,
        nextWater,
        notifId,
      ]
    );

    return await getPlants();
  } catch (error) {
    console.error("Error adding plant to SQLite:", error);
    return [];
  }
};

/**
 * Delete a plant, cancel its scheduled notification, and remove watering logs from SQLite.
 * @param {string} id 
 * @returns {Promise<Array>} Updated array of plant objects
 */
export const deletePlant = async (id) => {
  try {
    const db = await ensureDbReady();
    const strId = String(id);

    // Retrieve notification ID before deletion
    const plantRow = await db.getFirstAsync(
      "SELECT notification_id FROM plants WHERE id = ? OR CAST(id AS TEXT) = ?",
      [strId, strId]
    );

    if (plantRow && plantRow.notification_id) {
      await cancelPlantNotification(plantRow.notification_id);
    }

    await db.runAsync("DELETE FROM watering_logs WHERE plant_id = ? OR CAST(plant_id AS TEXT) = ?", [strId, strId]);
    await db.runAsync("DELETE FROM plants WHERE id = ? OR CAST(id AS TEXT) = ?", [strId, strId]);

    return await getPlants();
  } catch (error) {
    console.error("Error deleting plant from SQLite:", error);
    return [];
  }
};

/**
 * Mark a plant as watered today:
 * Updates last_watered_date (YYYY-MM-DD) and next_water_date (YYYY-MM-DD), reschedules watering notification, AND inserts a row into watering_logs.
 * @param {string} plantId 
 * @returns {Promise<Array>} Updated array of plant objects
 */
export const markAsWatered = async (plantId) => {
  try {
    const db = await ensureDbReady();
    const strId = String(plantId);

    const plantRow = await db.getFirstAsync(
      "SELECT * FROM plants WHERE id = ? OR CAST(id AS TEXT) = ?",
      [strId, strId]
    );

    if (!plantRow) {
      console.warn("Plant not found for markAsWatered:", plantId);
      return await getPlants();
    }

    const intervalDays = parseInt(plantRow.watering_interval_days, 10) || 7;
    const lastWateredDate = getTodayLocalDateString();
    const nextWaterDate = addDaysToLocalDateString(lastWateredDate, intervalDays);

    // Schedule/replace local notification for newly calculated next_water_date (YYYY-MM-DD)
    const newNotifId = await schedulePlantNotification({
      id: strId,
      name: plantRow.name,
      nextWaterDate: nextWaterDate,
      notificationId: plantRow.notification_id,
    });

    console.log(`[markAsWatered] Plant: "${plantRow.name}" (ID: ${strId})`);
    console.log(`  - Interval: ${intervalDays} days`);
    console.log(`  - Last Watered (Local): ${lastWateredDate}`);
    console.log(`  - Next Water (Local): ${nextWaterDate}`);
    console.log(`  - New Notification ID: ${newNotifId}`);

    // Update plant record in SQLite with local YYYY-MM-DD dates and notification ID
    await db.runAsync(
      `UPDATE plants 
       SET last_watered_date = ?, next_water_date = ?, notification_id = ? 
       WHERE id = ? OR CAST(id AS TEXT) = ?`,
      [lastWateredDate, nextWaterDate, newNotifId, strId, strId]
    );

    // Insert entry into watering_logs table
    const logId = Date.now().toString();
    await db.runAsync(
      `INSERT INTO watering_logs (id, plant_id, watered_on) 
       VALUES (?, ?, ?)`,
      [logId, strId, lastWateredDate]
    );

    const freshPlants = await getPlants();
    return freshPlants;
  } catch (error) {
    console.error("Error marking plant as watered in SQLite:", error);
    return await getPlants();
  }
};

/**
 * Retrieve watering history logs for a specific plant.
 * @param {string} plantId 
 * @returns {Promise<Array>} Array of log records
 */
export const getWateringLogs = async (plantId) => {
  try {
    const db = await ensureDbReady();
    const strId = String(plantId);
    return await db.getAllAsync(
      "SELECT * FROM watering_logs WHERE plant_id = ? OR CAST(plant_id AS TEXT) = ? ORDER BY watered_on DESC",
      [strId, strId]
    );
  } catch (error) {
    console.error("Error getting watering logs from SQLite:", error);
    return [];
  }
};
