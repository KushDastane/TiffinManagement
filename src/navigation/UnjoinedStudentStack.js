import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DiscoveryScreen } from '../screens/student/DiscoveryScreen';
import { TrialOrderScreen } from '../screens/student/TrialOrderScreen';
import { JoinKitchenScreen } from '../screens/student/JoinKitchenScreen';

const Stack = createNativeStackNavigator();

export const UnjoinedStudentStack = () => {
    const headerOptions = {
        headerStyle: {
            backgroundColor: '#ffffff',
        },
        headerTitleStyle: {
            fontSize: 22, // text-2xl equivalent
            fontWeight: '900', // font-black equivalent
            color: '#111827', // text-gray-900
        },
        headerTintColor: '#111827',
        headerShadowVisible: false,
    };

    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Discovery"
                component={DiscoveryScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="JoinKitchen"
                component={JoinKitchenScreen}
                options={{
                    title: '',
                    ...headerOptions
                }}
            />
        </Stack.Navigator>
    );
};
