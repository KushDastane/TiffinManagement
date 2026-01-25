import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { createUserProfile } from '../services/authService';
import tw from 'twrnc';
import { ChefHat, User, ArrowRight } from 'lucide-react-native';

export const RoleSelectScreen = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const selectRole = async (role) => {
        if (!user) return;
        setLoading(true);

        // Just setting the role here. The RootNavigator will then route to the appropriate setup screen.
        const result = await createUserProfile(user.uid, {
            email: user.email,
            phoneNumber: user.phoneNumber, // Ensure phone is saved if not already
            role: role
        });

        if (result.error) {
            Alert.alert("Error", "Failed to save role. Please try again.");
            setLoading(false);
        }
        // Success -> AuthContext updates -> RootNavigator redirects
    };

    return (
        <View style={tw`flex-1 bg-white items-center justify-center p-6`}>
            <View style={tw`w-full max-w-[85%] items-center mb-10`}>
                <Text style={tw`text-2xl font-black text-gray-900 tracking-tight text-center`}>Who are you?</Text>
                <Text style={tw`text-xs text-gray-400 mt-1 font-bold uppercase tracking-wide text-center`}>Choose your profile type</Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#FACC15" />
            ) : (
                <View style={tw`w-full max-w-[85%] gap-4`}>
                    <TouchableOpacity
                        style={tw`bg-yellow-50 border border-yellow-200 rounded-2xl p-5 flex-row items-center gap-4 shadow-sm`}
                        onPress={() => selectRole('admin')}
                    >
                        <View style={tw`w-12 h-12 bg-yellow-100 rounded-xl items-center justify-center`}>
                            <ChefHat size={24} color="#ca8a04" />
                        </View>
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-lg font-black text-gray-900`}>Kitchen Owner</Text>
                            <Text style={tw`text-[10px] text-gray-500 font-bold leading-tight`}>I run a tiffin service & manage orders.</Text>
                        </View>
                        <ArrowRight size={16} color="#ca8a04" />
                    </TouchableOpacity>

                    <Text style={tw`text-center text-gray-300 font-black text-[10px] uppercase tracking-widest`}>OR</Text>

                    <TouchableOpacity
                        style={tw`bg-gray-50 border border-gray-100 rounded-2xl p-5 flex-row items-center gap-4 shadow-sm`}
                        onPress={() => selectRole('student')}
                    >
                        <View style={tw`w-12 h-12 bg-gray-200 rounded-xl items-center justify-center`}>
                            <User size={24} color="#374151" />
                        </View>
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-lg font-black text-gray-900`}>Student / User</Text>
                            <Text style={tw`text-[10px] text-gray-500 font-bold leading-tight`}>I want to order meals from a kitchen.</Text>
                        </View>
                        <ArrowRight size={16} color="#374151" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};
