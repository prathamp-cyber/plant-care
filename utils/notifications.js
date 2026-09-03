import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { parseLocalDateStringTo9AM } from "./dates";

/**
 * LOCAL NOTIFICATIONS ONLY MODULE (3-STAGE REMINDER SYSTEM)
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Request local notification permissions from the user.
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
      console.log("Local notification permissions not granted.");
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
    console.error("Error requesting local notification permissions:", error);
    return false;
  }
};

/**
 * Schedule THREE local notification reminders (24h, 12h, and 1h before 9:00 AM on next_water_date).
 * Skips any triggers whose scheduled time has already passed.
 * Automatically cancels all previous notifications for the plant.
 * 
 * @param {Object} plant { id, name, nextWaterDate, notificationIds, notificationId }
 * @returns {Promise<Array<string>>} Array of scheduled notification ID strings.
 */
export const schedulePlantNotifications = async (plant) => {
  try {
    if (!plant || !plant.nextWaterDate) return [];

    // Cancel existing notifications for this plant if present
    const existingNotifIds = plant.notificationIds || plant.notificationId;
    if (existingNotifIds) {
      await cancelPlantNotifications(existingNotifIds);
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      return [];
    }

    // Parse target 9:00 AM local date timestamp on next_water_date
    const target9AMDate = parseLocalDateStringTo9AM(plant.nextWaterDate);
    const targetTimeMs = target9AMDate.getTime();
    const nowMs = Date.now();

    const remindersConfig = [
      {
        hoursBefore: 24,
        title: "🌱 Plant Care Reminder",
        body: `Reminder: ${plant.name} needs water tomorrow! Don't let your green friend get thirsty! 🪴`,
      },
      {
        hoursBefore: 12,
        title: "⏳ Heads Up!",
        body: `Heads up: ${plant.name} needs water in 12 hours. It's giving you the side-eye! 👀`,
      },
      {
        hoursBefore: 1,
        title: "🚨 Almost Time!",
        body: `Almost time! ${plant.name} needs water within the hour. Get that watering can ready! 💧`,
      },
    ];

    const scheduledIds = [];

    for (const config of remindersConfig) {
      const triggerTimeMs = targetTimeMs - config.hoursBefore * 60 * 60 * 1000;

      // Skip trigger times that have already passed
      if (triggerTimeMs <= nowMs) {
        console.log(
          `[Local Notifications] Skipping past trigger (${config.hoursBefore}h before) for "${plant.name}"`
        );
        continue;
      }

      const scheduledDate = new Date(triggerTimeMs);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: config.title,
          body: config.body,
          sound: true,
          data: { plantId: String(plant.id), stage: `${config.hoursBefore}h` },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: scheduledDate,
        },
      });

      console.log(
        `[Local Notifications] Scheduled ${config.hoursBefore}h reminder for "${plant.name}" (ID: ${notificationId}) at ${scheduledDate.toLocaleString()}`
      );
      scheduledIds.push(notificationId);
    }

    return scheduledIds;
  } catch (error) {
    console.error("Error scheduling 3-stage plant notifications:", error);
    return [];
  }
};

/**
 * Backward compatibility alias for single/plural notification scheduling.
 */
export const schedulePlantNotification = schedulePlantNotifications;

/**
 * Cancel previously scheduled notifications by ID string, array of IDs, or JSON array string.
 * @param {string|Array<string>} notificationIdsInput 
 */
export const cancelPlantNotifications = async (notificationIdsInput) => {
  try {
    if (!notificationIdsInput) return;

    let idsToCancel = [];
    if (Array.isArray(notificationIdsInput)) {
      idsToCancel = notificationIdsInput;
    } else if (typeof notificationIdsInput === "string") {
      if (notificationIdsInput.startsWith("[")) {
        try {
          idsToCancel = JSON.parse(notificationIdsInput);
        } catch (e) {
          idsToCancel = [notificationIdsInput];
        }
      } else {
        idsToCancel = [notificationIdsInput];
      }
    }

    for (const notifId of idsToCancel) {
      if (notifId && typeof notifId === "string") {
        await Notifications.cancelScheduledNotificationAsync(notifId);
        console.log(`[Local Notifications] Cancelled notification ID: ${notifId}`);
      }
    }
  } catch (error) {
    console.error("Error cancelling plant notifications:", error);
  }
};

/**
 * Backward compatibility alias for single/plural notification cancellation.
 */
export const cancelPlantNotification = cancelPlantNotifications;
