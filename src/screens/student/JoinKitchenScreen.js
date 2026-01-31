import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Keyboard, Pressable, Modal } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { joinKitchen } from '../../services/kitchenService';
import tw from 'twrnc';
import { ChefHat, ArrowRight, X } from 'lucide-react-native';

export const JoinKitchenScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [joinCode, setJoinCode] = useState('');
    const [loading, setLoading] = useState(false);

    const handleJoin = async () => {
        // Dismiss keyboard to ensure UI is stable
        Keyboard.dismiss();

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
            Alert.alert(
                "Success",
                "Joined kitchen successfully!",
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
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
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={tw`flex-1`}
        >
            {/* Dimmed Background Overlay */}
            <Pressable
                style={tw`absolute inset-0 bg-black/60`}
                onPress={() => navigation.goBack()}
            />

            <View style={tw`flex-1 justify-center items-center px-6`}>
                {/* Modal Card */}
                <Pressable style={tw`w-full bg-white rounded-[32px] overflow-hidden shadow-xl`} onPress={Keyboard.dismiss}>

                    {/* Close Button */}
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={tw`absolute top-4 right-4 z-10 p-2 bg-gray-50 rounded-full`}
                    >
                        <X size={20} color="#9ca3af" />
                    </TouchableOpacity>

                    <View style={tw`p-8 items-center`}>
                        {/* Icon */}
                        <View style={tw`w-16 h-16 bg-yellow-400 rounded-2xl items-center justify-center mb-5 rotate-3`}>
                            <ChefHat size={32} color="black" />
                        </View>

                        {/* Text */}
                        <Text style={tw`text-2xl font-black text-gray-900 text-center mb-1`}>
                            Join a Kitchen
                        </Text>
                        <Text style={tw`text-gray-400 font-bold text-xs uppercase tracking-widest text-center mb-8`}>
                            Enter Secret Code
                        </Text>

                        {/* Input */}
                        <View style={tw`w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-4 mb-6`}>
                            <TextInput
                                style={tw`text-3xl text-center font-black tracking-[6px] uppercase text-gray-900 w-full`}
                                placeholder="XXX-XXXX"
                                placeholderTextColor="#e5e7eb"
                                maxLength={8}
                                value={joinCode}
                                onChangeText={handleTextChange}
                                autoCapitalize="characters"
                                selectionColor="#ca8a04"
                                autoFocus={true}
                            />
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                            style={[
                                tw`w-full bg-gray-900 rounded-2xl py-4 items-center flex-row justify-center gap-2 shadow-lg`,
                                loading && tw`opacity-70`
                            ]}
                            onPress={handleJoin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={tw`text-white font-black text-sm uppercase tracking-widest`}>
                                        Join Now
                                    </Text>
                                    <ArrowRight size={16} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
};
