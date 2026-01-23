import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import tw from 'twrnc';

export const LoadingScreen = () => (
    <View style={tw`flex-1 items-center justify-center bg-white`}>
        <ActivityIndicator size="large" color="#FFD700" />
    </View>
);
