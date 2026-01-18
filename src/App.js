import React from "react";
import { AuthProvider } from "./contexts/AuthContext";
import { TenantProvider } from "./contexts/TenantContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NavigationContainer } from "@react-navigation/native";
import { RootNavigator } from "./navigation/RootNavigator";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function App() {
  return (
    <NavigationContainer>
      <SafeAreaProvider>
        <AuthProvider>
          <TenantProvider>
            <ThemeProvider>
              <RootNavigator />
              <StatusBar style="dark" />
            </ThemeProvider>
          </TenantProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </NavigationContainer>
  );
}

App.displayName = "App";
