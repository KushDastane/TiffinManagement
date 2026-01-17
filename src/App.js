import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { RootNavigator } from './navigation/RootNavigator';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <TenantProvider>
                    <RootNavigator />
                    <StatusBar style="dark" />
                </TenantProvider>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
