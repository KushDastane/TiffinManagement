import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { listenToAdminStats, getCookingSummary } from '../../services/adminService';
import { subscribeToMenu, getEffectiveMenuDateKey, getEffectiveMealSlot } from '../../services/menuService';
import { subscribeToOrders, updateOrder } from '../../services/orderService';
import tw from 'twrnc';
import { Clock, IndianRupee, Package, ChevronRight, Activity, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const StatCard = ({ icon: Icon, label, value, variant, onPress }) => {
    const variants = {
        danger: { bg: '#fef2f2', text: '#ef4444', iconBg: '#fee2e2' },
        warning: { bg: '#fffbeb', text: '#f59e0b', iconBg: '#fef3c7' },
        success: { bg: '#f0fdf4', text: '#10b981', iconBg: '#dcfce7' },
        info: { bg: '#f0f9ff', text: '#0ea5e9', iconBg: '#e0f2fe' },
        normal: { bg: '#f9fafb', text: '#6b7280', iconBg: '#f3f4f6' }
    };

    const style = variants[variant] || variants.normal;

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                tw`w-[47%] mb-4 bg-white rounded-[30px] p-6 border border-gray-100 shadow-sm overflow-hidden`,
                pressed && tw`scale-95 opacity-90`
            ]}
        >
            <View style={[tw`absolute -top-6 -right-6 w-16 h-16 opacity-10 rounded-full`, { backgroundColor: style.text }]} />
            <View style={[tw`w-12 h-12 rounded-2xl items-center justify-center mb-6 shadow-sm`, { backgroundColor: style.iconBg }]}>
                <Icon size={22} color={style.text} />
            </View>
            <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1`}>{label}</Text>
            <Text style={tw`text-2xl font-black text-gray-900`}>{value}</Text>
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
    const [confirmingId, setConfirmingId] = useState(null);

    const slot = useMemo(() => getEffectiveMealSlot(), []);
    const dateKey = useMemo(() => getEffectiveMenuDateKey(), []);

    useEffect(() => {
        if (!tenant?.id) return;

        const unsubStats = listenToAdminStats(tenant.id, slot, setStats);
        const unsubMenu = subscribeToMenu(tenant.id, dateKey, setMenuData);
        const unsubOrders = subscribeToOrders(tenant.id, dateKey, (newOrders) => {
            console.log("Admin Dashboard: Received orders count:", newOrders.length);
            setOrders(newOrders);
        });

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

    const nextPendingOrder = useMemo(() => {
        let pending = orders
            .filter(o => (o.status === 'PENDING' || o.status === 'placed') && o.slot === slot)
            .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));

        if (pending.length === 0) {
            pending = orders
                .filter(o => o.status === 'PENDING' || o.status === 'placed')
                .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        }

        return pending[0] || null;
    }, [orders, slot]);
    const handleQuickConfirm = async (orderId) => {
        try {
            setConfirmingId(orderId);
            const result = await updateOrder(tenant.id, orderId, { status: 'CONFIRMED' });
            if (result.error) Alert.alert("Error", result.error);
        } catch (err) {
            Alert.alert("Error", err.message);
        } finally {
            setConfirmingId(null);
        }
    };

    const greeting = useMemo(() => {
        if (slot === 'lunch') return "Good Afternoon! Lunch is in full swing. 🍲";
        if (slot === 'dinner') return "Good Evening! Prep for Dinner. 🌙";
        return "Ready for a great day? ☀️";
    }, [slot]);

    const todayStr = new Date().toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short'
    });

    console.log("Admin Dashboard Render: nextPendingOrder ID:", nextPendingOrder?.id);

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Creative Header - Premium Hook */}
            <LinearGradient
                colors={['#fef9c3', '#faf9f6']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={tw`pt-16 pb-10 px-6 rounded-b-[45px] shadow-sm`}
            >
                <View style={tw`flex-row justify-between items-start`}>
                    <View>
                        <View style={tw`flex-row items-center gap-2 mb-2`}>
                            <View style={tw`w-2 h-2 rounded-full bg-yellow-400 shadow-sm shadow-yellow-200`} />
                            <Text style={tw`text-[10px] font-black text-gray-500 uppercase tracking-widest`}>{todayStr}</Text>
                        </View>
                        <Text style={tw`text-3xl font-black text-gray-900 leading-tight`}>
                            Kitchen{"\n"}
                            <Text style={tw`text-yellow-600`}>Operations</Text>
                        </Text>
                    </View>
                    <View style={tw`w-14 h-14 rounded-[20px] bg-white items-center justify-center shadow-lg shadow-yellow-100 border border-white`}>
                        <Activity size={24} color="#eab308" />
                    </View>
                </View>
                <View style={tw`mt-6 flex-row items-center gap-2`}>
                    <View style={tw`bg-white/60 px-4 py-2 rounded-xl border border-white shadow-sm`}>
                        <Text style={tw`text-[11px] font-black text-gray-700 uppercase tracking-tight`}>{greeting}</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={tw`p-6 pb-32`}
                style={tw`flex-1`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Cooking Summary Banner - High Contrast */}
                {cookingSummary && (
                    <View style={tw`bg-white rounded-[35px] p-8 shadow-sm border border-gray-100 mb-8 overflow-hidden`}>
                        <View style={tw`absolute -top-10 -right-10 w-32 h-32 bg-yellow-50 rounded-full opacity-40`} />

                        <View style={tw`flex-row items-center gap-3 mb-8`}>
                            <View style={tw`w-10 h-10 rounded-xl bg-gray-900 items-center justify-center shadow-lg shadow-gray-200`}>
                                <Activity size={18} color="white" />
                            </View>
                            <View>
                                <Text style={tw`text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-0.5`}>Live Production</Text>
                                <Text style={tw`text-lg font-black text-gray-900`}>Cooking Breakdown</Text>
                            </View>
                        </View>

                        <View style={tw`flex-row justify-between items-center bg-gray-50/50 p-6 rounded-3xl border border-gray-50`}>
                            <View style={tw`items-center`}>
                                <Text style={tw`text-2xl font-black text-gray-900`}>{cookingSummary.halfDabba}</Text>
                                <Text style={tw`text-[9px] font-black text-gray-400 tracking-widest mt-1 uppercase`}>Half</Text>
                            </View>
                            <View style={tw`w-[1px] h-10 bg-gray-200/50`} />
                            <View style={tw`items-center`}>
                                <Text style={tw`text-2xl font-black text-gray-900`}>{cookingSummary.fullDabba}</Text>
                                <Text style={tw`text-[9px] font-black text-gray-400 tracking-widest mt-1 uppercase`}>Full</Text>
                            </View>
                            <View style={tw`w-[1px] h-10 bg-gray-200/50`} />
                            <View style={tw`items-center`}>
                                <Text style={tw`text-2xl font-black text-gray-900`}>{cookingSummary.extraRoti}</Text>
                                <Text style={tw`text-[9px] font-black text-gray-400 tracking-widest mt-1 uppercase`}>Roti</Text>
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
                </View>

                {/* Quick Confirm Section */}
                {nextPendingOrder ? (
                    <View style={tw`mt-4 bg-white rounded-3xl p-6 shadow-sm border border-yellow-100`}>
                        <View style={tw`flex-row items-center justify-between mb-4`}>
                            <View style={tw`flex-row items-center gap-2`}>
                                <Clock size={16} color="#eab308" />
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>Next Order to Confirm</Text>
                            </View>
                            <Pressable onPress={() => navigation.navigate('Orders')}>
                                <Text style={tw`text-[10px] font-black text-yellow-600 uppercase tracking-widest`}>See All</Text>
                            </Pressable>
                        </View>

                        <View style={tw`bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100`}>
                            <Text style={tw`text-base font-black text-gray-900`}>{nextPendingOrder.userDisplayName || 'Student'}</Text>
                            <Text style={tw`text-xs font-bold text-gray-400 uppercase mt-1`}>{nextPendingOrder.quantity} × {nextPendingOrder.mainItem}</Text>
                        </View>

                        <Pressable
                            onPress={() => handleQuickConfirm(nextPendingOrder.id)}
                            disabled={confirmingId === nextPendingOrder.id}
                            style={tw`bg-yellow-400 rounded-2xl py-4 items-center justify-center flex-row gap-2 shadow-lg shadow-yellow-500/20`}
                        >
                            {confirmingId === nextPendingOrder.id ? (
                                <ActivityIndicator color="#111827" size="small" />
                            ) : (
                                <>
                                    <Check size={20} color="#111827" />
                                    <Text style={tw`text-gray-900 font-black text-sm uppercase`}>Confirm & Next</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                ) : (
                    <Pressable
                        onPress={() => navigation.navigate('Orders')}
                        style={tw`mt-4 bg-white rounded-3xl p-6 flex-row items-center justify-between shadow-sm border border-gray-100`}
                    >
                        <View style={tw`flex-row items-center gap-4`}>
                            <View style={tw`bg-gray-100 p-3 rounded-2xl`}>
                                <Package size={24} color="#6b7280" />
                            </View>
                            <View>
                                <Text style={tw`text-lg font-black text-gray-900`}>All Orders</Text>
                                <Text style={tw`text-xs font-bold text-gray-400`}>No pending orders to confirm</Text>
                            </View>
                        </View>
                        <ChevronRight size={24} color="#9ca3af" />
                    </Pressable>
                )}

            </ScrollView>
        </View>
    );
};
