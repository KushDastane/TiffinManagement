import React, { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LogBox } from 'react-native';

// Suppress specific warnings
LogBox.ignoreLogs([
]);
import { AuthProvider } from "./contexts/AuthContext";
import { TenantProvider } from "./contexts/TenantContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RootNavigator } from "./navigation/RootNavigator";
import { SplashScreen } from "./components/SplashScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onAnimationComplete={handleSplashComplete} />;
  }

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
