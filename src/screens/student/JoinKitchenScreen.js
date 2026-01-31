import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { joinKitchen } from '../../services/kitchenService';
import tw from 'twrnc';
import { ChefHat, ArrowRight, Key } from 'lucide-react-native';

export const JoinKitchenScreen = () => {
    const { user } = useAuth();
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        if (!joinCode.trim() || joinCode.length < 8) {
            Alert.alert("Invalid Code", "Please enter a valid 8-character code (e.g., ZBJ-2929)");
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
        <ScrollView
            style={tw`flex-1 bg-white`}
            contentContainerStyle={tw`flex-grow items-center justify-center p-6`}
            showsVerticalScrollIndicator={false}
        >
            {/* Icon */}
            <View style={tw`w-20 h-20 bg-yellow-50 rounded-3xl items-center justify-center mb-6`}>
                <ChefHat size={36} color="#ca8a04" />
            </View>

            {/* Header */}
            <Text style={tw`text-2xl font-black text-gray-900 text-center tracking-tight mb-2`}>
                Join a Kitchen
            </Text>
            <Text style={tw`text-gray-500 text-sm font-medium text-center px-8 mb-10 leading-relaxed`}>
                Enter the code shared by{'\n'}your kitchen
            </Text>

            {/* Code Input */}
            <View style={tw`w-full max-w-sm mb-8`}>
                <View style={tw`bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 items-center`}>

                    <TextInput
                        style={tw`text-4xl text-center font-black tracking-[8px] uppercase text-gray-900 w-full`}
                        placeholder="ZBJ-2929"
                        placeholderTextColor="#d1d5db"
                        maxLength={8}
                        value={joinCode}
                        onChangeText={handleTextChange}
                        autoCapitalize="characters"
                        autoFocus={true}
                        editable={true}
                        selectionColor="#ca8a04"
                    />
                </View>

            </View>

            {/* Join Button */}
            <TouchableOpacity
                style={tw`w-full max-w-sm bg-yellow-400 rounded-xl py-4 items-center flex-row justify-center gap-2 shadow-sm ${loading ? 'opacity-70' : ''}`}
                onPress={handleJoin}
                disabled={loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <>
                        <Text style={tw`text-black font-black text-sm uppercase tracking-widest`}>
                            Join Kitchen
                        </Text>
                        <ArrowRight size={16} color="black" />
                    </>
                )}
            </TouchableOpacity>

            {/* Help Text */}
        </ScrollView>
    );
};
