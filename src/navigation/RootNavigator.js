import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

import { AuthStack } from './AuthStack';
import { AdminStack } from './AdminStack';
import { StudentStack } from './StudentStack';
import { RoleSelectScreen } from '../screens/RoleSelectScreen';
import { CreateKitchenScreen } from '../screens/admin/CreateKitchenScreen';
import { JoinKitchenScreen } from '../screens/student/JoinKitchenScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { loading: tenantLoading } = useTenant();

    // Show loading while initializing
    if (authLoading || tenantLoading) {
        return (
            <View className="flex-1 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#FFD700" />
            </View>
        );
    }

    // 1. Not Authenticated
    if (!user) {
        return (
            <NavigationContainer>
                <AuthStack />
            </NavigationContainer>
        );
    }

    // 2. Authenticated but no User Profile or Role
    if (!userProfile || !userProfile.role) {
        return (
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        );
    }

    // 3. Admin: Check if Kitchen Created
    if (userProfile.role === 'admin') {
        if (!userProfile.currentKitchenId) {
            return (
                <NavigationContainer>
                    <Stack.Navigator>
                        <Stack.Screen name="CreateKitchen" component={CreateKitchenScreen} options={{ title: 'Create Your Kitchen' }} />
                    </Stack.Navigator>
                </NavigationContainer>
            );
        }
        return (
            <NavigationContainer>
                <AdminStack />
            </NavigationContainer>
        );
    }

    // 4. Student: Check if Joined Kitchen
    if (userProfile.role === 'student') {
        // NOTE: Student might join multiple kitchens, but 'currentKitchenId' tracks the active one.
        // If no currentKitchenId, forced to join one? 
        // Or if 'joinedKitchens' is empty.

        const hasJoinedKitchens = userProfile.joinedKitchens && userProfile.joinedKitchens.length > 0;

        if (!hasJoinedKitchens) {
            return (
                <NavigationContainer>
                    <Stack.Navigator>
                        <Stack.Screen name="JoinKitchen" component={JoinKitchenScreen} options={{ title: 'Join a Kitchen' }} />
                    </Stack.Navigator>
                </NavigationContainer>
            );
        }

        // If has joined kitchens but none selected (edge case), select the first one?
        // Logic handled in AuthContext or here. For now, assume if joined, currentKitchenId is set.
        return (
            <NavigationContainer>
                <StudentStack />
            </NavigationContainer>
        );
    }

    return null;
};
