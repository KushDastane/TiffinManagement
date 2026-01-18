import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
import { logoutUser } from '../../services/authService';

export const SettingsScreen = () => {
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

    if (!tenant) return <View className="flex-1 bg-white" />;

    return (
        <View className="flex-1 bg-gray-50 p-4">
            {/* Kitchen Profile Card */}
            <View className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100 items-center">
                <View
                    style={{ backgroundColor: `${primaryColor}20` }}
                    className="w-20 h-20 rounded-full items-center justify-center mb-4 border-2"
                >
                    <Text
                        style={{ color: primaryColor }}
                        className="text-4xl font-black"
                    >
                        {tenant.name?.[0]}
                    </Text>
                </View>
                <Text className="text-2xl font-bold text-gray-800 mb-1">{tenant.name}</Text>
                <View className="flex-row items-center">
                    <View className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: primaryColor }} />
                    <Text className="text-gray-500 font-medium">Kitchen Owner</Text>
                </View>
            </View>

            {/* Join Code Section */}
            <View className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
                <Text className="text-gray-500 mb-2 font-medium uppercase tracking-wider text-xs">Student Join Code</Text>
                <View className="flex-row items-center justify-between">
                    <Text className="text-4xl font-mono font-bold text-gray-800 tracking-widest bg-gray-100 px-4 py-2 rounded-lg">
                        {tenant.joinCode}
                    </Text>
                    <TouchableOpacity
                        style={{ backgroundColor: primaryColor }}
                        className="px-6 py-3 rounded-xl shadow-sm"
                        onPress={handleShare}
                    >
                        <Text className="font-bold text-gray-900">Share</Text>
                    </TouchableOpacity>
                </View>
                <Text className="text-gray-400 text-xs mt-3">
                    Share this code with your students so they can join your kitchen.
                </Text>
            </View>

            {/* Logout Button */}
            <TouchableOpacity
                className="w-full bg-red-50 border border-red-100 rounded-xl p-5 items-center mt-auto"
                onPress={handleLogout}
            >
                <Text className="text-red-600 font-bold text-lg">Logout</Text>
            </TouchableOpacity>
        </View>
    );
};
