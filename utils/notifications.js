import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure default in-app notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request notification permissions from the user.
 * @returns {Promise<boolean>} True if granted, false otherwise.
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permissions not granted.");
      return false;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Plant Care Reminders",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2D6A4F",
      });
    }

    return true;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
};

/**
 * Schedule a local notification for a plant at 9:00 AM on its next_water_date.
 * Automatically cancels any existing notification for the same plant.
 * @param {Object} plant { id, name, nextWaterDate, notificationId }
 * @returns {Promise<string|null>} New notification ID string or null if failed.
 */
export const schedulePlantNotification = async (plant) => {
  try {
    if (!plant || !plant.nextWaterDate) return null;

    // Cancel existing notification for this plant if present
    if (plant.notificationId) {
      await cancelPlantNotification(plant.notificationId);
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    const nextDate = new Date(plant.nextWaterDate);
    if (isNaN(nextDate.getTime())) return null;

    // Target 9:00 AM on next_water_date
    let scheduledTime = new Date(
      nextDate.getFullYear(),
      nextDate.getMonth(),
      nextDate.getDate(),
      9,
      0,
      0
    );

    // If 9:00 AM on that date is already in the past, schedule for 1 minute from now
    if (scheduledTime.getTime() <= Date.now()) {
      scheduledTime = new Date(Date.now() + 60 * 1000);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🌱 Plant Care Reminder",
        body: `Time to water your ${plant.name}!`,
        sound: true,
        data: { plantId: String(plant.id) },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: scheduledTime,
      },
    });

    console.log(
      `[Notifications] Scheduled for "${plant.name}" (ID: ${notificationId}) at ${scheduledTime.toLocaleString()}`
    );
    return notificationId;
  } catch (error) {
    console.error("Error scheduling plant notification:", error);
    return null;
  }
};

/**
 * Cancel a previously scheduled notification by its ID.
 * @param {string} notificationId 
 */
export const cancelPlantNotification = async (notificationId) => {
  try {
    if (!notificationId) return;
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`[Notifications] Cancelled notification ID: ${notificationId}`);
  } catch (error) {
    console.error("Error cancelling plant notification:", error);
  }
};
