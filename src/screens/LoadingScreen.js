import React from 'react';
import { View, ActivityIndicator } from 'react-native';

export const LoadingScreen = () => (
    <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FFD700" />
    </View>
);
