import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DiscoveryScreen } from '../screens/student/DiscoveryScreen';
import { TrialOrderScreen } from '../screens/student/TrialOrderScreen';
import { JoinKitchenScreen } from '../screens/student/JoinKitchenScreen';

const Stack = createNativeStackNavigator();

export const UnjoinedStudentStack = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Discovery"
                component={DiscoveryScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="TrialOrder"
                component={TrialOrderScreen}
                options={{ title: 'Trial Order' }}
            />
            <Stack.Screen
                name="JoinKitchen"
                component={JoinKitchenScreen}
                options={{ title: 'Join Kitchen' }}
            />
        </Stack.Navigator>
    );
};
