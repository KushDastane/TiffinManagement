import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { joinKitchen } from '../../services/kitchenService';

export const JoinKitchenScreen = () => {
    const { user } = useAuth();
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!joinCode.trim() || joinCode.length < 6) {
            Alert.alert("Error", "Please enter a valid 6-digit code");
            return;
        }

        setLoading(true);
        const result = await joinKitchen(user.uid, joinCode.toUpperCase());
        setLoading(false);

        if (result.error) {
            Alert.alert("Error", result.error);
        } else {
            // Success! AuthContext/TenantContext will update and redirect
            Alert.alert("Success", "Joined kitchen successfully!");
        }
    };

    return (
        <View className="flex-1 bg-white items-center justify-center p-4">
            <Text className="text-2xl font-bold mb-4 text-gray-800">Join a Kitchen</Text>
            <Text className="text-gray-500 mb-8 text-center px-4">
                Enter the 6-character code shared by your kitchen manager.
            </Text>

            <TextInput
                className="w-full max-w-xs border-2 border-dashed border-gray-300 rounded-lg p-4 mb-8 text-3xl text-center font-mono tracking-widest uppercase focus:border-yellow-400"
                placeholder="XK9J2M"
                maxLength={6}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
            />

            <TouchableOpacity
                className={`w-full max-w-sm bg-yellow-400 rounded-lg p-4 items-center shadow-sm ${loading ? 'opacity-70' : ''}`}
                onPress={handleJoin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <Text className="text-black font-bold text-lg">Join Kitchen</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};
