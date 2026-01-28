import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { joinKitchen } from '../../services/kitchenService';
import tw from 'twrnc';

export const JoinKitchenScreen = () => {
    const { user } = useAuth();
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!joinCode.trim() || joinCode.length < 8) {
            Alert.alert("Error", "Please enter a valid code (e.g., ZBJ-2929)");
            return;
        }

        setLoading(true);
        const result = await joinKitchen(user.uid, joinCode.toUpperCase());
        setLoading(false);

        if (result.error) {
            Alert.alert("Error", result.error);
        } else {
            Alert.alert("Success", "Joined kitchen successfully!");
        }
    };

    const handleTextChange = (text) => {
        let formatted = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (formatted.length > 3) {
            formatted = formatted.slice(0, 3) + '-' + formatted.slice(3, 7);
        }
        setJoinCode(formatted);
    };

    return (
        <View style={tw`flex-1 bg-white items-center justify-center p-4`}>
            <Text style={tw`text-2xl font-black mb-4 text-gray-900`}>Join a Kitchen</Text>
            <Text style={tw`text-gray-500 mb-8 text-center px-4 font-bold`}>
                Enter the 8-character code (e.g., ZBJ-2929) shared by your kitchen manager.
            </Text>

            <TextInput
                style={tw`w-full max-w-xs border-2 border-dashed border-gray-300 rounded-3xl p-6 mb-8 text-3xl text-center font-black tracking-widest uppercase text-gray-900 focus:border-yellow-400`}
                placeholder="ZBJ-2929"
                placeholderTextColor="#d1d5db"
                maxLength={8}
                value={joinCode}
                onChangeText={handleTextChange}
                autoCapitalize="characters"
            />

            <TouchableOpacity
                style={[
                    tw`w-full max-w-sm bg-yellow-400 rounded-lg p-4 items-center shadow-sm`,
                    loading ? tw`opacity-70` : null
                ]}
                onPress={handleJoin}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <Text style={tw`text-black font-bold text-lg`}>Join Kitchen</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};
