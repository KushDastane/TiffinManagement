// DabbaMe Root Navigator
import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

import { AuthStack } from './AuthStack';
import { AdminStack } from './AdminStack';
import { StudentStack } from './StudentStack';
import { UnjoinedStudentStack } from './UnjoinedStudentStack';
import { RoleSelectScreen } from '../screens/RoleSelectScreen';
import { CreateKitchenScreen } from '../screens/admin/CreateKitchenScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { StudentSetupScreen } from '../screens/StudentSetupScreen';
import { LocationPickerScreen } from '../screens/student/LocationPickerScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { loading: tenantLoading } = useTenant();

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {(authLoading || tenantLoading) ? (
                <Stack.Screen name="Loading" component={LoadingScreen} />
            ) : !user ? (
                <Stack.Screen name="Auth" component={AuthStack} />
            ) : (!userProfile?.role) ? (
                // 1. First, select role (Admin vs Student)
                <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            ) : userProfile.role === 'admin' ? (
                // 2a. Admin Flow
                !userProfile.currentKitchenId ? (
                    <Stack.Screen name="CreateKitchen" component={CreateKitchenScreen} options={{ title: 'Create Your Kitchen' }} />
                ) : (
                    <Stack.Screen name="AdminRoot" component={AdminStack} />
                )
            ) : (
                // 2b. Student Flow
                !userProfile.name ? (
                    // Only ask for name IF they are a student and haven't set it yet
                    <Stack.Screen name="Setup" component={StudentSetupScreen} />
                ) : !userProfile.locationSet ? (
                    <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
                ) : !userProfile.currentKitchenId ? (
                    <Stack.Screen name="UnjoinedRoot" component={UnjoinedStudentStack} />
                ) : (
                    <Stack.Screen name="StudentRoot" component={StudentStack} />
                )
            )}
        </Stack.Navigator>
    );
};
