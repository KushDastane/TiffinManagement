import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { MenuScreen } from '../screens/admin/MenuScreen';
import { OrdersScreen } from '../screens/admin/OrdersScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';

// Placeholder screens
const StudentsScreen = () => <View className="flex-1 items-center justify-center"><Text>Student List</Text></View>;

const Tab = createBottomTabNavigator();

export const AdminStack = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: '#EAB308',
                tabBarInactiveTintColor: 'gray',
            }}
        >
            <Tab.Screen name="Menu" component={MenuScreen} options={{ title: 'Manage Menu' }} />
            <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Live Orders' }} />
            <Tab.Screen name="Students" component={StudentsScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Kitchen' }} />
        </Tab.Navigator>
    );
};
