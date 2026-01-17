import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { HomeScreen } from '../screens/student/HomeScreen';
import { HistoryScreen } from '../screens/student/HistoryScreen';
import { ProfileScreen } from '../screens/student/ProfileScreen';

const Tab = createBottomTabNavigator();

export const StudentStack = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: '#EAB308',
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Today\'s Menu' }} />
            <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Passbook' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};
