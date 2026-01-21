import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MenuScreen } from '../screens/admin/MenuScreen';
import { OrdersScreen } from '../screens/admin/OrdersScreen';
import { SettingsScreen } from '../screens/admin/SettingsScreen';
import { StudentsScreen } from '../screens/admin/StudentsScreen';
import { StudentDetailsScreen } from '../screens/admin/StudentDetailsScreen';
import { AdminPaymentsScreen } from '../screens/admin/AdminPaymentsScreen';
import { DashboardScreen } from '../screens/admin/DashboardScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomTabBar } from '../components/CustomTabBar';
import { Home, Package, Utensils, IndianRupee, Users, Settings as SettingsIcon } from 'lucide-react-native';

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
            options={{ headerShown: false }}
        />
    </StudentStackNav.Navigator>
);

/* ---------------- SETTINGS STACK ---------------- */

const AdminSettingsStack = () => (
    <SettingsStackNav.Navigator screenOptions={{ headerShown: false }}>
        <SettingsStackNav.Screen
            name="AdminSettingsHome"
            component={SettingsScreen}
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
                component={DashboardScreen}
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => <Home size={22} color={focused ? '#ca8a04' : '#9ca3af'} />,
                }}
            />

            <Tab.Screen
                name="Orders"
                component={OrdersScreen}
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ focused }) => <Package size={22} color={focused ? '#ca8a04' : '#9ca3af'} />,
                }}
            />

            <Tab.Screen
                name="Menu"
                component={MenuScreen}
                options={{
                    title: 'Menu',
                    tabBarIcon: ({ focused }) => <Utensils size={22} color={focused ? '#ca8a04' : '#9ca3af'} />,
                }}
            />

            <Tab.Screen
                name="Payments"
                component={AdminPaymentsScreen}
                options={{
                    title: 'Payments',
                    tabBarIcon: ({ focused }) => <IndianRupee size={22} color={focused ? '#ca8a04' : '#9ca3af'} />,
                }}
            />

            <Tab.Screen
                name="Students"
                component={StudentsStack}
                options={{
                    title: 'Students',
                    tabBarIcon: ({ focused }) => <Users size={22} color={focused ? '#ca8a04' : '#9ca3af'} />,
                }}
            />

            <Tab.Screen
                name="Settings"
                component={AdminSettingsStack}
                options={{
                    title: 'Settings',
                    unmountOnBlur: false,
                    tabBarIcon: ({ focused }) => <SettingsIcon size={22} color={focused ? '#ca8a04' : '#9ca3af'} />,
                }}
            />
        </Tab.Navigator>
    );
};

