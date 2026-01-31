import React, { useEffect, useState } from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { logoutUser, updateUserProfile } from '../services/authService';

import { AuthStack } from './AuthStack';
import { AdminStack } from './AdminStack';
import { StudentStack } from './StudentStack';
import { UnjoinedStudentStack } from './UnjoinedStudentStack';
import { RoleSelectScreen } from '../screens/RoleSelectScreen';
import { CreateKitchenScreen } from '../screens/admin/CreateKitchenScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { StudentSetupScreen } from '../screens/StudentSetupScreen';
import { IntroVideoScreen } from '../screens/IntroVideoScreen';
import { VIDEO_CONFIG } from '../config/videoConfig';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { loading: tenantLoading } = useTenant();
    const [introWatched, setIntroWatched] = useState(null); // null = checking, false = not watched, true = watched

    // Check intro video status when role is available
    useEffect(() => {
        const checkIntroStatus = async () => {
            if (userProfile?.role) {
                // 1. Check if Firestore already has it
                if (userProfile.hasWatchedIntro === true) {
                    setIntroWatched(true);
                    return;
                }

                // If it's explicitly false in Firestore, it's a new user/need to watch
                if (userProfile.hasWatchedIntro === false) {
                    setIntroWatched(false);
                    return;
                }

                // 2. Fallback to user-specific AsyncStorage (for legacy users who haven't synced yet)
                const storageKey = `HAS_WATCHED_INTRO_${userProfile.role.toUpperCase()}_${user.uid}`;

                try {
                    const hasWatched = await AsyncStorage.getItem(storageKey);
                    if (hasWatched === 'true') {
                        setIntroWatched(true);
                        // Sync back to Firestore if missing
                        updateUserProfile(user.uid, { hasWatchedIntro: true });
                    } else {
                        // Definitely not watched
                        setIntroWatched(false);
                    }
                } catch (e) {
                    console.error("Error checking intro video status", e);
                    setIntroWatched(false);
                }
            } else {
                setIntroWatched(null);
            }
        };

        checkIntroStatus();
    }, [userProfile?.role, userProfile?.hasWatchedIntro]);

    const handleIntroFinish = () => {
        setIntroWatched(true);
    };

    if (authLoading || tenantLoading || (userProfile?.role && introWatched === null)) {
        return <LoadingScreen />;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                <Stack.Screen name="Auth" component={AuthStack} />
            ) : (!userProfile?.role) ? (
                // 1. First, select role (Admin vs Student)
                <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
            ) : !introWatched ? (
                // 2. Show Intro Video if not watched
                <Stack.Screen name="IntroVideo">
                    {(props) => <IntroVideoScreen {...props} role={userProfile.role} onFinish={handleIntroFinish} />}
                </Stack.Screen>
            ) : userProfile.role === 'admin' ? (
                // 3a. Admin Flow
                !userProfile.activeKitchenId ? (
                    <Stack.Screen name="CreateKitchen" component={CreateKitchenScreen} options={{ title: 'Create Your Kitchen' }} />
                ) : (
                    <Stack.Screen name="AdminRoot" component={AdminStack} />
                )
            ) : (
                // 3b. Student Flow
                !userProfile.locationSet ? (
                    // Unified setup: Name + Location
                    <Stack.Screen name="Setup" component={StudentSetupScreen} />
                ) : !userProfile.activeKitchenId ? (
                    <Stack.Screen name="UnjoinedRoot" component={UnjoinedStudentStack} />
                ) : (
                    <Stack.Screen name="StudentRoot" component={StudentStack} />
                )
            )}
        </Stack.Navigator>
    );
};
