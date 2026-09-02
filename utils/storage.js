import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "plants";

/**
 * Retrieve all saved plants from AsyncStorage.
 * @returns {Promise<Array>} Array of plant objects
 */
export const getPlants = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting plants from AsyncStorage:", error);
    return [];
  }
};

/**
 * Save an array of plant objects to AsyncStorage.
 * @param {Array} plantsArray 
 */
export const savePlants = async (plantsArray) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plantsArray));
  } catch (error) {
    console.error("Error saving plants to AsyncStorage:", error);
  }
};

/**
 * Add a new plant object to AsyncStorage.
 * @param {Object} plant 
 * @returns {Promise<Array>} Updated array of plants
 */
export const addPlant = async (plant) => {
  try {
    const existing = await getPlants();
    const updated = [...existing, plant];
    await savePlants(updated);
    return updated;
  } catch (error) {
    console.error("Error adding plant to AsyncStorage:", error);
    return [];
  }
};

/**
 * Delete a plant by its ID from AsyncStorage.
 * @param {string|number} id 
 * @returns {Promise<Array>} Updated array of plants
 */
export const deletePlant = async (id) => {
  try {
    const existing = await getPlants();
    const updated = existing.filter((p) => p.id !== id);
    await savePlants(updated);
    return updated;
  } catch (error) {
    console.error("Error deleting plant from AsyncStorage:", error);
    return [];
  }
};
