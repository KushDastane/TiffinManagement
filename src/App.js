import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "./contexts/AuthContext";
import { TenantProvider } from "./contexts/TenantContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RootNavigator } from "./navigation/RootNavigator";

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthProvider>
          <TenantProvider>
            <ThemeProvider>
              <RootNavigator />
              <StatusBar style="dark" />
            </ThemeProvider>
          </TenantProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

App.displayName = "App";
