// TiffinCRM Root Navigator
import React from 'react';

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
import { LoadingScreen } from '../screens/LoadingScreen';

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
            ) : (!userProfile || !userProfile.role) ? (
                <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            ) : userProfile.role === 'admin' ? (
                !userProfile.currentKitchenId ? (
                    <Stack.Screen name="CreateKitchen" component={CreateKitchenScreen} options={{ title: 'Create Your Kitchen' }} />
                ) : (
                    <Stack.Screen name="AdminRoot" component={AdminStack} />
                )
            ) : (
                // Student
                (!userProfile.joinedKitchens || userProfile.joinedKitchens.length === 0) ? (
                    <Stack.Screen name="JoinKitchen" component={JoinKitchenScreen} options={{ title: 'Join a Kitchen' }} />
                ) : (
                    <Stack.Screen name="StudentRoot" component={StudentStack} />
                )
            )}
        </Stack.Navigator>
    );
};
