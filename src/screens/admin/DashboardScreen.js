import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Dimensions } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { listenToAdminStats, getCookingSummary } from '../../services/adminService';
import { subscribeToMenu, getEffectiveMenuDateKey, getEffectiveMealSlot } from '../../services/menuService';
import { subscribeToOrders } from '../../services/orderService';
import tw from 'twrnc';
import { Clock, IndianRupee, Package, Users, ChevronRight, Activity } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const StatCard = ({ icon: Icon, label, value, variant, onPress }) => {
    const colors = {
        danger: ['#fca5a5', '#f87171'],
        warning: ['#fcd34d', '#fbbf24'],
        success: ['#6ee7b7', '#34d399'],
        info: ['#7dd3fc', '#38bdf8'],
        normal: ['#e5e7eb', '#d1d5db']
    };

    const gradient = colors[variant] || colors.normal;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                tw`w-[47%] mb-4 rounded-3xl overflow-hidden shadow-sm border border-black/5`,
                pressed && tw`scale-95 opacity-90`
            ]}
        >
            <LinearGradient colors={gradient} style={tw`p-[2px]`}>
                <View style={tw`bg-white rounded-[22px] p-4`}>
                    <View style={tw`flex-row items-center gap-3 mb-2`}>
                        <View style={[tw`w-10 h-10 rounded-2xl items-center justify-center shadow-sm`, { backgroundColor: gradient[0] }]}>
                            <Icon size={20} color="#111827" />
                        </View>
                    </View>
                    <Text style={tw`text-[10px] font-bold text-gray-400 uppercase tracking-wide`}>{label}</Text>
                    <Text style={tw`text-2xl font-black text-gray-900 mt-1`}>{value}</Text>
                </View>
            </LinearGradient>
        </Pressable>
    );
};

export const DashboardScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { tenant } = useTenant();

    const [stats, setStats] = useState({
        pendingOrders: 0,
        totalOrders: 0,
        pendingPayments: 0,
        studentsToday: 0
    });
    const [menuData, setMenuData] = useState(null);
    const [orders, setOrders] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const slot = useMemo(() => getEffectiveMealSlot(), []);
    const dateKey = useMemo(() => getEffectiveMenuDateKey(), []);

    useEffect(() => {
        if (!tenant?.id) return;

        const unsubStats = listenToAdminStats(tenant.id, slot, setStats);
        const unsubMenu = subscribeToMenu(tenant.id, dateKey, setMenuData);
        const unsubOrders = subscribeToOrders(tenant.id, dateKey, setOrders);

        return () => {
            unsubStats();
            unsubMenu();
            unsubOrders();
        };
    }, [tenant?.id, slot, dateKey]);

    const cookingSummary = useMemo(() => {
        return getCookingSummary(orders, menuData?.[slot]);
    }, [orders, menuData, slot]);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const todayStr = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short'
    });

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Header */}
            <View style={tw`px-6 pt-14 pb-6 bg-white border-b border-gray-100`}>
                <Text style={tw`text-xs font-bold text-gray-400 uppercase tracking-widest`}>{todayStr}</Text>
                <Text style={tw`text-2xl font-black text-gray-900 mt-1`}>Kitchen Operations</Text>
                <Text style={tw`text-sm text-gray-500`}>Monitor orders and activity</Text>
            </View>

            <ScrollView
                contentContainerStyle={tw`p-6 pb-24`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Cooking Summary Banner */}
                {cookingSummary && (
                    <View style={tw`bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-8`}>
                        <View style={tw`flex-row items-center gap-2 mb-4`}>
                            <Activity size={18} color="#ca8a04" />
                            <Text style={tw`text-xs font-black text-gray-400 uppercase tracking-widest`}>Cooking Breakdown ({slot?.toUpperCase()})</Text>
                        </View>

                        <View style={tw`flex-row justify-between`}>
                            <View style={tw`items-center`}>
                                <Text style={tw`text-lg font-black text-gray-900`}>{cookingSummary.halfDabba}</Text>
                                <Text style={tw`text-[10px] font-bold text-gray-400`}>HALF</Text>
                            </View>
                            <View style={tw`w-[1px] h-8 bg-gray-100 self-center`} />
                            <View style={tw`items-center`}>
                                <Text style={tw`text-lg font-black text-gray-900`}>{cookingSummary.fullDabba}</Text>
                                <Text style={tw`text-[10px] font-bold text-gray-400`}>FULL</Text>
                            </View>
                            <View style={tw`w-[1px] h-8 bg-gray-100 self-center`} />
                            <View style={tw`items-center`}>
                                <Text style={tw`text-lg font-black text-gray-900`}>{cookingSummary.extraRoti}</Text>
                                <Text style={tw`text-[10px] font-bold text-gray-400`}>EXT ROTI</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Stats Grid */}
                <View style={tw`flex-row flex-wrap justify-between`}>
                    <StatCard
                        icon={Clock}
                        label="Pending Orders"
                        value={stats.pendingOrders}
                        variant={stats.pendingOrders > 0 ? "danger" : "normal"}
                        onPress={() => navigation.navigate('Orders')}
                    />
                    <StatCard
                        icon={IndianRupee}
                        label="Pend. Payments"
                        value={stats.pendingPayments}
                        variant={stats.pendingPayments > 0 ? "warning" : "normal"}
                        onPress={() => navigation.navigate('Payments')}
                    />
                    <StatCard
                        icon={Package}
                        label="Total Orders"
                        value={stats.totalOrders}
                        variant="success"
                    />
                    <StatCard
                        icon={Users}
                        label="Students Ordered"
                        value={stats.studentsToday}
                        variant="info"
                    />
                </View>

                {/* Live Orders CTA */}
                <Pressable
                    onPress={() => navigation.navigate('Orders')}
                    style={tw`mt-4 bg-yellow-400 rounded-3xl p-6 flex-row items-center justify-between shadow-md`}
                >
                    <View style={tw`flex-row items-center gap-4`}>
                        <View style={tw`bg-white/20 p-3 rounded-2xl`}>
                            <Package size={24} color="#111827" />
                        </View>
                        <View>
                            <Text style={tw`text-lg font-black text-gray-900`}>Manage Orders</Text>
                            <Text style={tw`text-xs font-bold text-gray-900/60`}>Confirm and deliver meals</Text>
                        </View>
                    </View>
                    <ChevronRight size={24} color="#111827" />
                </Pressable>

            </ScrollView>
        </View>
    );
};
