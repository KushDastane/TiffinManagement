import React from 'react';
import { View, Text, Pressable, Share } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
import { logoutUser } from '../../services/authService';
import tw from 'twrnc';

export const SettingsScreen = ({ navigation }) => {
    const { userProfile } = useAuth();
    const { tenant } = useTenant();
    const { primaryColor } = useTheme();

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

    if (!tenant) return <View style={tw`flex-1 bg-white`} />;

    return (
        <View style={tw`flex-1 bg-gray-50 p-4`}>
            {/* Kitchen Profile Card */}
            <View style={tw`bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100 items-center`}>
                <View
                    style={[tw`w-20 h-20 rounded-full items-center justify-center mb-4 border-2`, { backgroundColor: `${primaryColor}20` }]}
                >
                    <Text
                        style={[tw`text-4xl font-black`, { color: primaryColor }]}
                    >
                        {tenant.name?.[0]}
                    </Text>
                </View>
                <Text style={tw`text-2xl font-bold text-gray-800 mb-1`}>{tenant.name}</Text>
                <View style={tw`flex-row items-center`}>
                    <View style={[tw`w-3 h-3 rounded-full mr-2`, { backgroundColor: primaryColor }]} />
                    <Text style={tw`text-gray-500 font-medium`}>Kitchen Owner</Text>
                </View>
            </View>

            {/* NEW: Kitchen Settings Section */}
            <Pressable
                onPress={() => navigation.navigate('MealConfig')}
                style={{
                    backgroundColor: '#FFFFFF',
                    padding: 24,
                    borderRadius: 12,
                    marginBottom: 24,
                    borderWidth: 1,
                    borderColor: '#F3F4F6',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1
                }}
            >
                <View style={tw`flex-row items-center`}>
                    <View style={tw`w-10 h-10 bg-gray-50 rounded-full items-center justify-center mr-4`}>
                        <Text style={tw`text-lg`}>🍱</Text>
                    </View>
                    <View>
                        <Text style={tw`text-gray-800 font-bold text-lg`}>Meal Structure</Text>
                        <Text style={tw`text-gray-500 text-xs`}>Dabba sizes, Roti counts & Add-ons</Text>
                    </View>
                </View>
                <Text style={tw`text-gray-400 text-xl font-bold`}>{'>'}</Text>
            </Pressable>

            {/* Join Code Section */}
            <View style={tw`bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100`}>
                <Text style={tw`text-gray-500 mb-2 font-medium uppercase tracking-wider text-xs`}>Student Join Code</Text>
                <View style={tw`flex-row items-center justify-between`}>
                    <Text style={tw`text-4xl font-mono font-bold text-gray-800 tracking-widest bg-gray-100 px-4 py-2 rounded-lg`}>
                        {tenant.joinCode}
                    </Text>
                    <Pressable
                        onPress={handleShare}
                        style={{
                            backgroundColor: primaryColor,
                            paddingHorizontal: 24,
                            paddingVertical: 12,
                            borderRadius: 12,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 2,
                            elevation: 1
                        }}
                    >
                        <Text style={tw`font-bold text-gray-900`}>Share</Text>
                    </Pressable>
                </View>
                <Text style={tw`text-gray-400 text-xs mt-3`}>
                    Share this code with your students so they can join your kitchen.
                </Text>
            </View>

            {/* Logout Button */}
            <Pressable
                onPress={handleLogout}
                style={{
                    width: '100%',
                    backgroundColor: '#FEF2F2',
                    borderWidth: 1,
                    borderColor: '#FEE2E2',
                    borderRadius: 12,
                    padding: 20,
                    alignItems: 'center',
                    marginTop: 'auto'
                }}
            >
                <Text style={tw`text-red-600 font-bold text-lg`}>Logout</Text>
            </Pressable>
        </View>
    );
};
