import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { HomeScreen } from '../screens/student/HomeScreen';
import { OrderScreen } from '../screens/student/OrderScreen';
import { HistoryScreen } from '../screens/student/HistoryScreen';
import { ProfileScreen } from '../screens/student/ProfileScreen';
import { JoinKitchenScreen } from '../screens/student/JoinKitchenScreen';
import { DiscoveryScreen } from '../screens/student/DiscoveryScreen';
import { KhataStack } from './KhataStack';
import { StudentTabBar } from '../components/StudentTabBar';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const StudentTabs = () => {
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

export const StudentStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="StudentTabs" component={StudentTabs} />
            <Stack.Screen
                name="JoinKitchen"
                component={JoinKitchenScreen}
                options={{
                    presentation: 'modal',
                    headerShown: true,
                    title: 'Join Kitchen',
                    headerStyle: { backgroundColor: '#ffffff' },
                    headerTitleStyle: { fontSize: 22, fontWeight: '900', color: '#111827' },
                    headerTintColor: '#111827',
                    headerShadowVisible: false,
                }}
            />
            <Stack.Screen
                name="Discovery"
                component={DiscoveryScreen}
                options={{
                    presentation: 'modal',
                    headerShown: false,
                }}
            />
        </Stack.Navigator>
    );
};
