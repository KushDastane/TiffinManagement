import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { createUserProfile, updateUserProfile } from '../services/authService';
import tw from 'twrnc';
import { User, ArrowRight, ChevronLeft } from 'lucide-react-native';

export const StudentSetupScreen = () => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState(false);

    const handleBack = async () => {
        setResetting(true);
        // Reset role to null to go back to Role Selection
        await updateUserProfile(user.uid, { role: null });
        setResetting(false);
    };

    useEffect(() => {
        const onBackPress = () => {
            handleBack();
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    const handleSave = async () => {
        if (!name.trim()) return;
        setLoading(true);
        const result = await createUserProfile(user.uid, {
            name: name.trim(),
            phoneNumber: user.phoneNumber,
            hasSeenOnboarding: false, // For first-time profile landing
        });
        if (result.error) Alert.alert("Error", result.error);
        setLoading(false);
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>

            {/* Back Button */}
            <TouchableOpacity
                onPress={handleBack}
                style={tw`absolute top-4 left-3 p-2 bg-gray-50 rounded-full z-50`}
                disabled={resetting || loading}
            >
                {resetting
                    ? <ActivityIndicator size="small" color="#9ca3af" />
                    : <ChevronLeft size={20} color="#374151" />
                }
            </TouchableOpacity>

            <KeyboardAvoidingView style={tw`flex-1 items-center justify-center px-6 pt-12 pb-6`}>


                {/* Header */}
                <View style={tw`w-full max-w-[85%] items-center mb-10`}>
                    <View style={tw`w-14 h-14 bg-yellow-100 rounded-2xl items-center justify-center mb-3`}>
                        <User size={24} color="#ca8a04" />
                    </View>
                    <Text style={tw`text-2xl font-black text-gray-900 tracking-tight text-center`}>Introduction</Text>
                    <Text style={tw`text-xs text-gray-400 mt-1 font-bold uppercase tracking-wide text-center`}>Who should we cook for?</Text>
                </View>

                {/* Form */}
                <View style={tw`w-full max-w-[85%]`}>
                    <View style={tw`bg-gray-50 rounded-2xl p-4 mb-6 relative`}>
                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Your Full Name</Text>
                        <TextInput
                            style={tw`w-full text-lg font-bold text-gray-900 py-1`}
                            placeholder="e.g. Kush Dastane"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            selectionColor="#ca8a04"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={loading}
                        style={tw`w-full bg-yellow-400 rounded-2xl py-4 shadow-sm items-center flex-row justify-center gap-2`}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="black" />
                        ) : (
                            <>
                                <Text style={tw`text-black font-black text-xs uppercase tracking-widest`}>Get Started</Text>
                                <ArrowRight size={16} color="black" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};
