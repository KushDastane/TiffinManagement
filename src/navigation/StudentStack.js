import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { HomeScreen } from '../screens/student/HomeScreen';
import { OrderScreen } from '../screens/student/OrderScreen';
import { HistoryScreen } from '../screens/student/HistoryScreen';
import { ProfileScreen } from '../screens/student/ProfileScreen';
import { KhataStack } from './KhataStack';
import { StudentTabBar } from '../components/StudentTabBar';

const Tab = createBottomTabNavigator();

export const StudentStack = () => {
    return (
        <Tab.Navigator
            initialRouteName="Home"
            tabBar={props => <StudentTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: { position: 'absolute' },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'Home' }}
            />
            <Tab.Screen
                name="Order"
                component={OrderScreen}
                options={{ title: 'Order' }}
            />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{ title: 'History' }}
            />
            <Tab.Screen
                name="Khata"
                component={KhataStack}
                options={{ title: 'Khata' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'Profile' }}
            />
        </Tab.Navigator>
    );
};
