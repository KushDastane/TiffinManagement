import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { MenuScreen } from '../screens/admin/MenuScreen';
import { OrdersScreen } from '../screens/admin/OrdersScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';
import { StudentsScreen } from '../screens/admin/StudentsScreen';
import { StudentDetailsScreen } from '../screens/admin/StudentDetailsScreen';
import { AdminPaymentsScreen } from '../screens/admin/AdminPaymentsScreen';
import { MealConfigScreen } from '../screens/admin/MealConfigScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomTabBar } from '../components/CustomTabBar';

const Tab = createBottomTabNavigator();
const StudentStackNav = createNativeStackNavigator();
const SettingsStackNav = createNativeStackNavigator();

/* ---------------- STUDENTS STACK ---------------- */

const StudentsStack = () => (
    <StudentStackNav.Navigator screenOptions={{ headerShown: false }}>
        <StudentStackNav.Screen
            name="StudentsList"
            component={StudentsScreen}
        />
        <StudentStackNav.Screen
            name="StudentDetails"
            component={StudentDetailsScreen}
            options={{ headerShown: true, title: 'Ledger' }}
        />
    </StudentStackNav.Navigator>
);

/* ---------------- SETTINGS STACK (🔥 FIXED) ---------------- */

// Wrapper stabilizes NativeWind + Stack
const MealConfigWrapper = (props) => {
    return <MealConfigScreen {...props} />;
};

const AdminSettingsStack = () => (
    <SettingsStackNav.Navigator screenOptions={{ headerShown: false }}>
        <SettingsStackNav.Screen
            name="AdminSettingsHome"
            component={SettingsScreen}
        />
        <SettingsStackNav.Screen
            name="MealConfig"
            component={MealConfigWrapper}
            options={{ headerShown: true, title: 'Meal Structure' }}
        />
    </SettingsStackNav.Navigator>
);

/* ---------------- ADMIN TAB NAV ---------------- */

export const AdminStack = () => {
    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} />}
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
                    tabBarIcon: ({ focused }) => <Text>{focused ? '🏠' : '📊'}</Text>,
                }}
            />

            <Tab.Screen
                name="Orders"
                component={OrdersScreen}
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '📝' : '📋'}</Text>,
                }}
            />

            <Tab.Screen
                name="Menu"
                component={MenuScreen}
                options={{
                    title: 'Menu',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '🥘' : '🍲'}</Text>,
                }}
            />

            <Tab.Screen
                name="Payments"
                component={AdminPaymentsScreen}
                options={{
                    title: 'Payments',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '💰' : '💸'}</Text>,
                }}
            />

            <Tab.Screen
                name="Students"
                component={StudentsStack}
                options={{
                    title: 'Students',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '👥' : '👤'}</Text>,
                }}
            />

            <Tab.Screen
                name="Settings"
                component={AdminSettingsStack}
                options={{
                    title: 'Settings',
                    unmountOnBlur: false, // 🔥 IMPORTANT
                    tabBarIcon: ({ focused }) => <Text>{focused ? '⚙️' : '🔧'}</Text>,
                }}
            />
        </Tab.Navigator>
    );
};
