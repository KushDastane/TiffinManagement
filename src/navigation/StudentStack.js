import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { HomeScreen } from '../screens/student/HomeScreen';

// Placeholder screens
const HistoryScreen = () => <View className="flex-1 items-center justify-center"><Text>Order History</Text></View>;
const ProfileScreen = () => <View className="flex-1 items-center justify-center"><Text>My Profile</Text></View>;

const Tab = createBottomTabNavigator();

export const StudentStack = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: '#EAB308',
            }}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Today\'s Menu' }} />
            <Tab.Screen name="History" component={HistoryScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};
