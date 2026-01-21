import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Image } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { logoutUser } from '../../services/authService';
import tw from 'twrnc';
import { User, Phone, LogOut, ChefHat } from 'lucide-react-native';

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
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Header */}
            <View style={tw`px-6 pt-14 pb-6 bg-white`}>
                <Text style={tw`text-2xl font-bold text-gray-900`}>My Profile</Text>
            </View>

            <ScrollView contentContainerStyle={tw`p-6`}>
                {/* Profile Card */}
                <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6`}>
                    <View style={tw`flex-row items-center gap-4 mb-6`}>
                        <View style={tw`w-14 h-14 rounded-2xl bg-yellow-100 items-center justify-center`}>
                            <User size={24} color="#854d0e" />
                        </View>
                        <View>
                            <Text style={tw`text-xl font-bold text-gray-900`}>
                                {userProfile?.name || user?.email?.split('@')[0] || 'Student'}
                            </Text>
                            <Text style={tw`text-sm text-gray-500`}>
                                {userProfile?.role === 'admin' ? 'Admin' : 'Student Account'}
                            </Text>
                        </View>
                    </View>

                    {/* Details */}
                    <View style={tw`flex-row items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100`}>
                        <View style={tw`w-10 h-10 rounded-xl bg-white items-center justify-center border border-gray-100`}>
                            <Phone size={18} color="#4b5563" />
                        </View>
                        <View>
                            <Text style={tw`text-xs text-gray-400 font-medium`}>Phone Number</Text>
                            <Text style={tw`text-sm font-bold text-gray-900`}>{userProfile?.phoneNumber || "—"}</Text>
                        </View>
                    </View>
                </View>

                {/* Tenant Info */}
                {tenant && (
                    <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8`}>
                        <View style={tw`flex-row items-center gap-2 mb-4`}>
                            <ChefHat size={20} color="#ca8a04" />
                            <Text style={tw`text-xs font-bold text-gray-400 uppercase tracking-widest`}>Joined Kitchen</Text>
                        </View>

                        <Text style={tw`text-2xl font-black text-gray-900`}>{tenant.name}</Text>

                        <View style={tw`mt-4 bg-yellow-50 self-start px-3 py-1 rounded-lg border border-yellow-100`}>
                            <Text style={tw`text-yellow-800 text-xs font-bold`}>Code: {tenant.joinCode}</Text>
                        </View>
                    </View>
                )}

                {/* Logout Button */}
                <Pressable
                    onPress={handleLogout}
                    style={tw`w-full bg-red-50 border border-red-100 rounded-2xl py-4 flex-row items-center justify-center gap-2`}
                >
                    <LogOut size={20} color="#b91c1c" />
                    <Text style={tw`text-red-700 font-bold text-base`}>Logout</Text>
                </Pressable>

                <Text style={tw`text-center text-xs text-gray-300 mt-8`}>v1.0.0 • TiffinCRM</Text>
            </ScrollView>
        </View>
    );
};
