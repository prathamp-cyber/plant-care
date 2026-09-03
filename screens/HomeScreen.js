import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { getPlants, markAsWatered, deletePlant } from "../utils/storage";
import { PLANT_LOOKUP } from "../data/plantLookup";
import { calculateDaysLeft } from "../utils/dates";

export default function HomeScreen({ navigation }) {
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch all plants from storage whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchPlantsData = async () => {
        setLoading(true);
        try {
          const storedPlants = await getPlants();
          if (isMounted) {
            setPlants(storedPlants);
          }
        } catch (error) {
          console.error("Failed to load plants:", error);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      fetchPlantsData();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  /**
   * Show toast notification feedback.
   */
  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2400),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastMessage(null);
    });
  };

  /**
   * Handle 'Mark as Watered' action for a plant.
   */
  const handleMarkAsWatered = async (plant) => {
    try {
      await markAsWatered(plant.id);
      // Re-fetch fresh plant records directly from SQLite
      const freshPlants = await getPlants();
      setPlants(freshPlants);

      const updatedPlant = freshPlants.find((p) => String(p.id) === String(plant.id));
      const remainingDays = updatedPlant ? calculateDaysLeft(updatedPlant.nextWaterDate) : 0;

      showToast(`💧 ${plant.name} marked as watered! (Next in ${remainingDays} days)`);
    } catch (error) {
      console.error("Failed to mark plant as watered:", error);
    }
  };

  /**
   * Handle plant deletion with native confirmation dialog.
   */
  const handleDeletePlant = (plant) => {
    Alert.alert(
      "Delete Plant",
      `Delete "${plant.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedList = await deletePlant(plant.id);
              setPlants(updatedList);
              showToast(`🗑️ ${plant.name} deleted`);
            } catch (error) {
              console.error("Failed to delete plant:", error);
            }
          },
        },
      ]
    );
  };

  /**
   * Get theme colors and status strings based on daysLeft.
   */
  const getStatusTheme = (daysLeft) => {
    if (daysLeft > 2) {
      return {
        borderColor: "#2D6A4F",
        badgeBg: "#E2F1E7",
        badgeText: "#1B4332",
        cardBg: "#FFFFFF",
        countdownText: `Water in ${daysLeft} days`,
        statusLabel: "Healthy",
        waterButtonBg: "#2D6A4F",
      };
    } else if (daysLeft >= 0) {
      return {
        borderColor: "#D97706",
        badgeBg: "#FEF3C7",
        badgeText: "#92400E",
        cardBg: "#FFFBEB",
        countdownText: daysLeft === 0 ? "Water today!" : `Water in ${daysLeft} day`,
        statusLabel: "Due Soon",
        waterButtonBg: "#D97706",
      };
    } else {
      const overdueDays = Math.abs(daysLeft);
      return {
        borderColor: "#DC2626",
        badgeBg: "#FEE2E2",
        badgeText: "#991B1B",
        cardBg: "#FEF2F2",
        countdownText: `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
        statusLabel: "Overdue",
        waterButtonBg: "#DC2626",
      };
    }
  };

  /**
   * Get category label (Indoor / Farm / Custom).
   */
  const getCategory = (plant) => {
    if (plant.category) return plant.category;
    if (plant.species && PLANT_LOOKUP[plant.species]) {
      return PLANT_LOOKUP[plant.species].category;
    }
    return plant.species === "custom" ? "Custom" : "Indoor";
  };

  const renderPlantItem = ({ item }) => {
    const daysLeft = calculateDaysLeft(item.nextWaterDate);
    const theme = getStatusTheme(daysLeft);
    const category = getCategory(item);

    return (
      <View
        style={[
          styles.plantCard,
          { borderColor: theme.borderColor, backgroundColor: theme.cardBg },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.plantEmoji}>
              {category === "Farm" ? "🌾" : category === "Custom" ? "✨" : "🪴"}
            </Text>
            <Text style={styles.plantName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <View style={[styles.categoryBadge, { backgroundColor: theme.badgeBg }]}>
              <Text style={[styles.categoryBadgeText, { color: theme.badgeText }]}>
                {category}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.deleteIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => handleDeletePlant(item)}
            >
              <Text style={styles.deleteIconText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.intervalText}>
            ⏱️ Interval: Every {item.wateringIntervalDays} days
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.countdownPill, { backgroundColor: theme.badgeBg }]}>
            <Text style={[styles.countdownPillText, { color: theme.badgeText }]}>
              {theme.countdownText}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.waterButton, { backgroundColor: theme.waterButtonBg }]}
            activeOpacity={0.8}
            onPress={() => handleMarkAsWatered(item)}
          >
            <Text style={styles.waterButtonText}>💧 Mark Watered</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Plant Care</Text>
          <Text style={styles.headerSubtitle}>
            {plants.length} {plants.length === 1 ? "plant" : "plants"} tracked
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("AddPlant")}
        >
          <Text style={styles.addButtonText}>+ Add Plant</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2D6A4F" />
          <Text style={styles.loadingText}>Loading your plants...</Text>
        </View>
      ) : plants.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>No plants added yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap + to add your first indoor or farm plant!
          </Text>
          <TouchableOpacity
            style={styles.emptyAddButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("AddPlant")}
          >
            <Text style={styles.emptyAddButtonText}>+ Add First Plant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={plants}
          keyExtractor={(item) => item.id}
          renderItem={renderPlantItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },
  toastContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: "#1B4332",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    zIndex: 999,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2F1E7",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1B4332",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#52796F",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#2D6A4F",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#1B4332",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#52796F",
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1B4332",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#52796F",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyAddButton: {
    backgroundColor: "#2D6A4F",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#1B4332",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  emptyAddButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
  },
  plantCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#1B4332",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  plantEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  plantName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B4332",
    flex: 1,
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  deleteIconButton: {
    padding: 4,
  },
  deleteIconText: {
    fontSize: 16,
  },
  cardBody: {
    marginBottom: 12,
  },
  intervalText: {
    fontSize: 14,
    color: "#52796F",
    fontWeight: "500",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countdownPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  countdownPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  waterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  waterButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});
