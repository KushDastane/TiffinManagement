import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MenuScreen } from '../screens/admin/MenuScreen';
import { OrdersScreen } from '../screens/admin/OrdersScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';
import { StudentsScreen } from '../screens/admin/StudentsScreen';
import { StudentDetailsScreen } from '../screens/admin/StudentDetailsScreen';

const Tab = createBottomTabNavigator();
const StudentStackNav = createNativeStackNavigator();

// Nested Stack for Students tab so we can drill down to details
const StudentsStack = () => (
    <StudentStackNav.Navigator>
        <StudentStackNav.Screen name="StudentsList" component={StudentsScreen} options={{ headerShown: false }} />
        <StudentStackNav.Screen name="StudentDetails" component={StudentDetailsScreen} options={{ title: 'Ledger' }} />
    </StudentStackNav.Navigator>
);

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
            <Tab.Screen name="Students" component={StudentsStack} options={{ title: 'Students', headerShown: false }} />
            <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Kitchen' }} />
        </Tab.Navigator>
    );
};
