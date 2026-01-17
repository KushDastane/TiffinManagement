import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { HomeScreen } from '../screens/student/HomeScreen';
import { HistoryScreen } from '../screens/student/HistoryScreen'; // Used for History
import { ProfileScreen } from '../screens/student/ProfileScreen';
import { KhataStack } from './KhataStack';
import { AddPaymentScreen } from '../screens/student/AddPaymentScreen';
import { CustomTabBar } from '../components/CustomTabBar';

// Use HomeScreen for both "Home" (Dashboard) and "Order" (Menu) for now, 
// OR split them if Logic differs. 
// Requirement said:
// Home: Dashboard elements
// Order: "Build Your Thali" UI
// Current HomeScreen HAS BOTH. Ideally split. 
// For now, I'll direct "Order" to the current HomeScreen (Menu)
// And "Home" to a Simplified Dashboard view (using same component but maybe prop?)
// OR simpler: Just clone functionality or use layout.

// Let's assume HomeScreen acts as the "Order" screen mainly. 
// We need a DASHBOARD for Home.

const DashboardScreen = ({ navigation }) => {
    // Re-use logic or navigate? 
    // Let's create a wrapper or simple pass-through to Order for now and fix content later 
    // if distinct content needed. 
    // User req: "Home" has Wallet/Summary. "Order" has Menu.
    // Current HomeScreen HAS Wallet/Summary AND Menu.
    return <HomeScreen viewMode="dashboard" navigation={navigation} />;
};
const OrderScreen = () => <HomeScreen viewMode="order" />;

const Tab = createBottomTabNavigator();

export const StudentStack = () => {
    return (
        <Tab.Navigator
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: { position: 'absolute' }, // Required for custom floating
            }}
        >
            <Tab.Screen
                name="Home"
                component={DashboardScreen}
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '🏠' : '🏚️'}</Text>
                }}
            />
            <Tab.Screen
                name="Order"
                component={OrderScreen}
                options={{
                    title: 'Order',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '🍱' : '🥡'}</Text>
                }}
            />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{
                    title: 'History',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '📜' : '📄'}</Text>
                }}
            />
            <Tab.Screen
                name="Khata"
                component={KhataStack}
                options={{
                    title: 'Khata',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '📒' : '📔'}</Text>
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => <Text>{focused ? '👤' : '😐'}</Text>
                }}
            />
            {/* Add Payment screen is typically a modal or stack item, not a TAB. 
                But user asked for specific tabs. KHATA has "Add Payment" button.
                We might need a nested stack for Khata to show AddPayment.
            */}
        </Tab.Navigator>
    );
};
