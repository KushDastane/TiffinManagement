import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { MenuScreen } from '../screens/admin/MenuScreen';
import { OrdersScreen } from '../screens/admin/OrdersScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';
import { StudentsScreen } from '../screens/admin/StudentsScreen';
import { StudentDetailsScreen } from '../screens/admin/StudentDetailsScreen';
import { AdminPaymentsScreen } from '../screens/admin/AdminPaymentsScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomTabBar } from '../components/CustomTabBar';

const Tab = createBottomTabNavigator();
const StudentStackNav = createNativeStackNavigator();

// Nested Stack for Students tab so we can drill down to details
const StudentsStack = () => (
    <StudentStackNav.Navigator>
        <StudentStackNav.Screen name="StudentsList" component={StudentsScreen} options={{ headerShown: false }} />
        <StudentStackNav.Screen name="StudentDetails" component={StudentDetailsScreen} options={{ title: 'Ledger' }} />
    </StudentStackNav.Navigator>
);

// Admin Dashboard Home? User said: "Home, Orders, Menu, Payments, Settings, Students" - That's 6 tabs.
// And "Admin Dashboard Content should include ... Header, Meal Status, Stats Cards, Live List".
// That content IS what I built in `OrdersScreen.js` (Stats + Live List).
// So `OrdersScreen` effectively acts as the Dashboard.
// Let's alias "Home" to "OrdersScreen" or split. 
// "Home" -> Dashboard (Stats + Live Orders).
// "Orders" -> Maybe History? Or just duplicate for now as user asked for both tabs.
// Let's make "Home" the main dashboard `OrdersScreen`.
// And "Orders" tab can simply be the same screen for now, or maybe a dedicated "All Orders History" listing (Future).
// I will reuse OrdersScreen for Home.

export const AdminStack = () => {
    return (
        <Tab.Navigator
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: { position: 'absolute' },
            }}
        >
            <Tab.Screen
                name="Home"
                component={OrdersScreen}
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '🏠' : '📊'}</Text>
                }}
            />
            <Tab.Screen
                name="Orders"
                component={OrdersScreen}
                initialParams={{ viewMode: 'list' }} // Maybe handle different view logic later
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '📝' : '📋'}</Text>
                }}
            />
            <Tab.Screen
                name="Menu"
                component={MenuScreen}
                options={{
                    title: 'Menu',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '🥘' : '🍲'}</Text>
                }}
            />
            <Tab.Screen
                name="Payments"
                component={AdminPaymentsScreen}
                options={{
                    title: 'Payments',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '💰' : '💸'}</Text>
                }}
            />
            <Tab.Screen
                name="Students"
                component={StudentsStack}
                options={{
                    title: 'Students',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '👥' : '👤'}</Text>
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '⚙️' : '🔧'}</Text>
                }}
            />
        </Tab.Navigator>
    );
};
