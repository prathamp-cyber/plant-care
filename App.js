import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./screens/HomeScreen";
import AddPlantScreen from "./screens/AddPlantScreen";
import { initDb } from "./utils/db";
import { requestNotificationPermissions } from "./utils/notifications";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    const setupApp = async () => {
      try {
        await initDb();
        await requestNotificationPermissions();
      } catch (err) {
        console.error("Error setting up database or notifications:", err);
      }
    };

    setupApp();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: "#2D6A4F",
          },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: {
            fontWeight: "700",
          },
          contentStyle: {
            backgroundColor: "#F4F7F4",
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: "Plant Care" }}
        />
        <Stack.Screen 
          name="AddPlant" 
          component={AddPlantScreen} 
          options={{ title: "Add New Plant" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
