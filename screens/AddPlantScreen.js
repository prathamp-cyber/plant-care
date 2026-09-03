import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { PLANT_LOOKUP } from "../data/plantLookup";
import { addPlant } from "../utils/storage";
import { getTodayLocalDateString, addDaysToLocalDateString } from "../utils/dates";

export default function AddPlantScreen({ navigation }) {
  const [selectedKey, setSelectedKey] = useState("Snake Plant"); // default selection
  const [customName, setCustomName] = useState("");
  const [customInterval, setCustomInterval] = useState("7");
  const [photoUri, setPhotoUri] = useState(null);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const isCustom = selectedKey === "custom";

  // Group lookup plants by category
  const indoorPlants = Object.keys(PLANT_LOOKUP).filter(
    (key) => PLANT_LOOKUP[key].category === "Indoor"
  );
  const farmPlants = Object.keys(PLANT_LOOKUP).filter(
    (key) => PLANT_LOOKUP[key].category === "Farm"
  );

  const handleSelectPlant = (key) => {
    setSelectedKey(key);
    setErrorMsg("");
    setIsPickerVisible(false);
  };

  /**
   * Launch Camera to capture photo
   */
  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Needed",
          "Camera access is required to take a plant photo. You can still save your plant without a photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Camera error:", err);
      Alert.alert("Error", "Could not access camera.");
    }
  };

  /**
   * Launch Media Library to pick photo
   */
  const handleLaunchLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Needed",
          "Photo library access is required to select an image. You can still save your plant without a photo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Gallery error:", err);
      Alert.alert("Error", "Could not access photo library.");
    }
  };

  /**
   * Show Photo Source selection dialog (Camera vs Library)
   */
  const handlePhotoOptions = () => {
    Alert.alert("Plant Photo", "Choose photo source:", [
      { text: "📷 Take Photo", onPress: handleLaunchCamera },
      { text: "🖼️ Choose from Gallery", onPress: handleLaunchLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    setErrorMsg("");
    const plantName = isCustom ? customName.trim() : selectedKey;

    if (!plantName) {
      setErrorMsg("Plant name cannot be empty.");
      return;
    }

    let intervalNum = 7;
    if (isCustom) {
      const parsed = parseInt(customInterval, 10);
      if (isNaN(parsed) || parsed <= 0) {
        setErrorMsg("Please enter a valid watering interval (greater than 0 days).");
        return;
      }
      intervalNum = parsed;
    } else {
      intervalNum = PLANT_LOOKUP[selectedKey].interval;
    }

    const todayLocal = getTodayLocalDateString();
    const nextWaterLocal = addDaysToLocalDateString(todayLocal, intervalNum);

    const newPlant = {
      id: Date.now().toString(),
      name: plantName,
      species: isCustom ? "custom" : selectedKey,
      photoUri: photoUri || null,
      wateringIntervalDays: intervalNum,
      lastWateredDate: todayLocal,
      nextWaterDate: nextWaterLocal,
    };

    try {
      await addPlant(newPlant);
      navigation.goBack();
    } catch (err) {
      console.error("Failed to save plant:", err);
      Alert.alert("Error", "Could not save plant. Please try again.");
    }
  };

  const getSelectedLabel = () => {
    if (isCustom) return "✨ Custom Plant";
    const item = PLANT_LOOKUP[selectedKey];
    return `🌿 ${selectedKey} (${item.category} • ${item.interval} days)`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>Add New Plant</Text>
          <Text style={styles.headerSubtitle}>
            Select from catalog or define a custom plant
          </Text>

          {/* Plant Selector Button */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Plant Species / Type</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              activeOpacity={0.8}
              onPress={() => setIsPickerVisible(true)}
            >
              <Text style={styles.pickerButtonText}>{getSelectedLabel()}</Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Photo Attachment Field */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Plant Photo (Optional)</Text>
            {photoUri ? (
              <View style={styles.photoPreviewCard}>
                <Image source={{ uri: photoUri }} style={styles.photoPreviewImage} />
                <View style={styles.photoActionRow}>
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={handlePhotoOptions}
                  >
                    <Text style={styles.changePhotoText}>📷 Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setPhotoUri(null)}
                  >
                    <Text style={styles.removePhotoText}>❌ Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addPhotoButton}
                activeOpacity={0.8}
                onPress={handlePhotoOptions}
              >
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Add Photo (Camera or Gallery)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Preset Plant Details Card */}
          {!isCustom && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Category:</Text>
                <Text style={styles.infoValue}>
                  {PLANT_LOOKUP[selectedKey]?.category}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Default Interval:</Text>
                <Text style={styles.infoValue}>
                  Every {PLANT_LOOKUP[selectedKey]?.interval} days
                </Text>
              </View>
            </View>
          )}

          {/* Custom Plant Form Fields */}
          {isCustom && (
            <View style={styles.customContainer}>
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Plant Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Aloe Vera, Fiddle Leaf Fig"
                  placeholderTextColor="#94A3B8"
                  value={customName}
                  onChangeText={(val) => {
                    setCustomName(val);
                    if (errorMsg) setErrorMsg("");
                  }}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Watering Interval (Days) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="7"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={customInterval}
                  onChangeText={(val) => {
                    setCustomInterval(val);
                    if (errorMsg) setErrorMsg("");
                  }}
                />
              </View>
            </View>
          )}

          {/* Validation Error Message */}
          {errorMsg !== "" && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            activeOpacity={0.8}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Plant</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dropdown Selection Modal */}
      <Modal
        visible={isPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Plant Type</Text>
              <TouchableOpacity onPress={() => setIsPickerVisible(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {/* Custom Option */}
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  selectedKey === "custom" && styles.selectedOption,
                ]}
                onPress={() => handleSelectPlant("custom")}
              >
                <Text style={styles.optionEmoji}>✨</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>Custom Plant</Text>
                  <Text style={styles.optionSubtitle}>
                    Specify your own name and watering interval
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Indoor Plants Section */}
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>🏠 Indoor Plants</Text>
              </View>
              {indoorPlants.map((key) => {
                const item = PLANT_LOOKUP[key];
                const isSelected = selectedKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.optionItem,
                      isSelected && styles.selectedOption,
                    ]}
                    onPress={() => handleSelectPlant(key)}
                  >
                    <Text style={styles.optionEmoji}>🪴</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>{key}</Text>
                      <Text style={styles.optionSubtitle}>
                        Water every {item.interval} days
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Farm Plants Section */}
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>🌾 Farm Plants</Text>
              </View>
              {farmPlants.map((key) => {
                const item = PLANT_LOOKUP[key];
                const isSelected = selectedKey === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.optionItem,
                      isSelected && styles.selectedOption,
                    ]}
                    onPress={() => handleSelectPlant(key)}
                  >
                    <Text style={styles.optionEmoji}>🌱</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>{key}</Text>
                      <Text style={styles.optionSubtitle}>
                        Water every {item.interval} days
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F7F4",
  },
  scrollContent: {
    padding: 24,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1B4332",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#52796F",
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D6A4F",
    marginBottom: 8,
  },
  pickerButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D8E2DC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1B4332",
    flex: 1,
  },
  pickerArrow: {
    fontSize: 12,
    color: "#52796F",
    marginLeft: 8,
  },
  addPhotoButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D8E2DC",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  addPhotoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D6A4F",
  },
  photoPreviewCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D8E2DC",
  },
  photoPreviewImage: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  },
  photoActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#F8FAFC",
  },
  changePhotoButton: {
    backgroundColor: "#E2F1E7",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changePhotoText: {
    color: "#1B4332",
    fontSize: 13,
    fontWeight: "600",
  },
  removePhotoButton: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removePhotoText: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: "#E2F1E7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#2D6A4F",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: "#2D6A4F",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#1B4332",
    fontWeight: "700",
  },
  customContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#D8E2DC",
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1B4332",
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#2D6A4F",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#1B4332",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1B4332",
  },
  closeButtonText: {
    fontSize: 18,
    color: "#64748B",
    padding: 4,
  },
  modalList: {
    paddingHorizontal: 20,
  },
  categoryHeader: {
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E2F1E7",
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2D6A4F",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  selectedOption: {
    backgroundColor: "#E2F1E7",
  },
  optionEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1B4332",
  },
  optionSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
});
