import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { RoleSelectScreen } from '../screens/RoleSelectScreen';
import { CreateKitchenScreen } from '../screens/admin/CreateKitchenScreen';
import { JoinKitchenScreen } from '../screens/student/JoinKitchenScreen';

const Stack = createNativeStackNavigator();

export const AuthStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            <Stack.Screen name="CreateKitchen" component={CreateKitchenScreen} options={{ headerShown: true, title: 'Create Kitchen' }} />
            <Stack.Screen name="JoinKitchen" component={JoinKitchenScreen} options={{ headerShown: true, title: 'Join Kitchen' }} />
        </Stack.Navigator>
    );
};
