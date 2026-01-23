import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { createUserProfile } from '../services/authService';
import tw from 'twrnc';

export const RoleSelectScreen = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const selectRole = async (role) => {
        if (!user) return;
        setLoading(true);

        const result = await createUserProfile(user.uid, {
            email: user.email,
            role: role
        });

        if (result.error) {
            Alert.alert("Error", "Failed to save role. Please try again.");
            setLoading(false);
        }
        // Success will automatically trigger navigation via AuthContext -> RootNavigator
    };

    return (
        <View style={tw`flex-1 bg-white items-center justify-center p-4`}>
            <Text style={tw`text-2xl font-bold mb-8 text-gray-800`}>Who are you?</Text>

            {loading ? (
                <ActivityIndicator size="large" color="#FACC15" />
            ) : (
                <>
                    <TouchableOpacity
                        style={tw`w-full max-w-sm bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-6 items-center shadow-sm`}
                        onPress={() => selectRole('admin')}
                    >
                        <Text style={tw`text-xl font-bold mb-2 text-yellow-800`}>Kitchen Owner</Text>
                        <Text style={tw`text-gray-600 text-center`}>I run a tiffin service and want to manage orders.</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={tw`w-full max-w-sm bg-blue-50 border-2 border-blue-400 rounded-xl p-6 items-center shadow-sm`}
                        onPress={() => selectRole('student')}
                    >
                        <Text style={tw`text-xl font-bold mb-2 text-blue-800`}>Student / Customer</Text>
                        <Text style={tw`text-gray-600 text-center`}>I want to join a kitchen and order meals.</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
};
