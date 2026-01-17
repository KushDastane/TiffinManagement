import React from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { logoutUser } from '../../services/authService';

export const SettingsScreen = () => {
    const { userProfile } = useAuth();
    const { tenant } = useTenant();

    const handleShare = async () => {
        if (!tenant?.joinCode) return;
        try {
            await Share.share({
                message: `Join my kitchen "${tenant.name}" on Tiffin CRM using code: ${tenant.joinCode}`,
            });
        } catch (error) {
            console.error(error.message);
        }
    };

    const handleLogout = async () => {
        await logoutUser();
    };

    if (!tenant) return <View className="flex-1 bg-white" />;

    return (
        <View className="flex-1 bg-gray-50 p-4">
            {/* Kitchen Profile Card */}
            <View className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100 items-center">
                <View className="w-20 h-20 bg-yellow-100 rounded-full items-center justify-center mb-4">
                    <Text className="text-3xl font-bold text-yellow-600">{tenant.name?.[0]}</Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mb-1">{tenant.name}</Text>
                <Text className="text-gray-500">Admin</Text>
            </View>

            {/* Join Code Section */}
            <View className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
                <Text className="text-gray-500 mb-2 font-medium uppercase tracking-wider text-xs">Student Join Code</Text>
                <View className="flex-row items-center justify-between">
                    <Text className="text-4xl font-mono font-bold text-gray-800 tracking-widest bg-gray-100 px-4 py-2 rounded-lg">
                        {tenant.joinCode}
                    </Text>
                    <TouchableOpacity
                        className="bg-yellow-400 px-4 py-2 rounded-lg"
                        onPress={handleShare}
                    >
                        <Text className="font-bold text-black">Share</Text>
                    </TouchableOpacity>
                </View>
                <Text className="text-gray-400 text-xs mt-2">
                    Share this code with your students so they can join your kitchen.
                </Text>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
                className="w-full bg-red-50 border border-red-200 rounded-lg p-4 items-center"
                onPress={handleLogout}
            >
                <Text className="text-red-600 font-bold text-lg">Logout</Text>
            </TouchableOpacity>
        </View>
    );
};
