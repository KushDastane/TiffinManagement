import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { logoutUser } from '../../services/authService';

export const ProfileScreen = () => {
    const { user, userProfile } = useAuth();
    const { tenant } = useTenant();

    const handleLogout = async () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: 'destructive',
                    onPress: async () => {
                        const result = await logoutUser();
                        if (result.error) {
                            Alert.alert("Error", result.error);
                        }
                    }
                }
            ]
        );
    };

    return (
        <View className="flex-1 bg-gray-50 p-4">
            {/* Profile Card */}
            <View className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100 items-center">
                <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
                    <Text className="text-3xl font-bold text-blue-600">
                        {(userProfile?.id || user?.email || 'U')[0].toUpperCase()}
                    </Text>
                </View>
                <Text className="text-xl font-bold text-gray-800 mb-1">
                    {userProfile?.phoneNumber || user?.email || 'Student'}
                </Text>
                <Text className="text-gray-500">Student Account</Text>
            </View>

            {/* Tenant Info */}
            {tenant && (
                <View className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
                    <Text className="text-gray-500 mb-2 font-medium uppercase tracking-wider text-xs">Joined Kitchen</Text>
                    <Text className="text-2xl font-bold text-gray-800">{tenant.name}</Text>
                    <Text className="text-gray-400 text-sm mt-1">Code: {tenant.joinCode}</Text>
                </View>
            )}

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
