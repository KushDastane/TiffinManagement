import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { KhataScreen } from '../screens/student/KhataScreen';
import { AddPaymentScreen } from '../screens/student/AddPaymentScreen';

const Stack = createNativeStackNavigator();

export const KhataStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="KhataMain" component={KhataScreen} />
            <Stack.Screen name="AddPayment" component={AddPaymentScreen} options={{ presentation: 'modal' }} />
        </Stack.Navigator>
    );
};
