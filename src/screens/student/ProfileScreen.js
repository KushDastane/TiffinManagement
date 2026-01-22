import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Image } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { logoutUser } from '../../services/authService';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
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
            {/* Header - Continuity */}
            <LinearGradient
                colors={['#fff', '#faf9f6']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={tw`px-6 pt-14 pb-8 rounded-b-[40px] shadow-sm border-b border-gray-100/50`}
            >
                <Text style={tw`text-2xl font-black text-gray-900`}>My Profile</Text>
                <Text style={tw`text-yellow-600 text-[9px] font-black uppercase tracking-widest mt-0.5`}>Account & Kitchen Settings</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={tw`p-6 pb-32`} style={tw`flex-1 -mt-4`} showsVerticalScrollIndicator={false}>
                {/* Profile Card - Premium Minimalist */}
                <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6`}>
                    <View style={tw`flex-row items-center gap-4 mb-8`}>
                        <View style={tw`w-16 h-16 rounded-2xl bg-gray-50 items-center justify-center border border-gray-100`}>
                            <User size={28} color="#111827" />
                        </View>
                        <View>
                            <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1`}>Student Profile</Text>
                            <Text style={tw`text-2xl font-black text-gray-900`}>
                                {userProfile?.name?.split(' ')[0] || 'Student'}
                                <Text style={tw`text-gray-400 font-bold`}> {userProfile?.name?.split(' ').slice(1).join(' ')}</Text>
                            </Text>
                        </View>
                    </View>

                    {/* Details - Clean Row */}
                    <View style={tw`flex-row items-center gap-4 px-1`}>
                        <View style={tw`w-8 h-8 rounded-xl bg-gray-50 items-center justify-center`}>
                            <Phone size={14} color="#9ca3af" />
                        </View>
                        <View>
                            <Text style={tw`text-[8px] font-black text-gray-300 uppercase tracking-widest`}>Phone Number</Text>
                            <Text style={tw`text-xs font-black text-gray-900`}>{userProfile?.phoneNumber || "Not Set"}</Text>
                        </View>
                    </View>
                </View>

                {/* Tenant Info - Glassy Style */}
                {tenant && (
                    <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8`}>
                        <View style={tw`flex-row items-center gap-2 mb-6`}>
                            <ChefHat size={14} color="#ca8a04" />
                            <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest`}>Connected Kitchen</Text>
                        </View>

                        <Text style={tw`text-3xl font-black text-gray-900 mb-6`}>{tenant.name}</Text>

                        <View style={tw`bg-gray-50 p-4 rounded-2xl border border-gray-100 flex-row justify-between items-center`}>
                            <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest`}>Joining Code</Text>
                            <View style={tw`bg-yellow-400 px-3 py-1 rounded-lg`}>
                                <Text style={tw`text-gray-900 text-[10px] font-black uppercase`}>{tenant.joinCode}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Logout Button - Minimalist Understated */}
                <Pressable
                    onPress={handleLogout}
                    style={tw`w-full bg-white border border-red-50 rounded-2xl py-4 flex-row items-center justify-center gap-2 shadow-sm`}
                >
                    <LogOut size={16} color="#ef4444" />
                    <Text style={tw`text-red-500 font-black text-[11px] uppercase tracking-widest`}>Sign Out Account</Text>
                </Pressable>

                <Text style={tw`text-center text-xs text-gray-300 mt-8`}>v1.0.0 • DabbaMe</Text>
            </ScrollView>
        </View>
    );
};
