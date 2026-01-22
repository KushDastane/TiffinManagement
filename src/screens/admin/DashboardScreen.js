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

    const menuStatus = useMemo(() => {
        if (!slot) return { label: "Off Hours", color: "gray", subLabel: "Kitchen is resting" };
        const slotData = menuData?.[slot];
        if (!slotData) return { label: `${slot.toUpperCase()} Menu Not Set`, color: "red", subLabel: "Action Required" };
        return { label: "Ready to Serve", color: "yellow", subLabel: slotData.mainItem };
    }, [menuData, slot]);

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* 1. Creative Absolute Header - Fixed & Sticky */}
            <View style={tw`absolute pb-3 top-0 left-0 right-0 z-10`}>
                <LinearGradient
                    colors={['#fffbeb', '#fef9c3', '#faf9f6']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={tw`pt-16 pb-14 px-6 rounded-b-[50px] shadow-sm`}
                >
                    <View style={tw`flex-row justify-between items-start mb-8`}>
                        <View>
                            <Text style={tw`text-[10px] font-black text-yellow-600 uppercase tracking-[0.2em] mb-1`}>{todayStr}</Text>
                            <Text style={tw`text-3xl font-black text-gray-900 leading-tight`}>
                                Kitchen{"\n"}
                                <Text style={tw`text-yellow-600`}>Terminal</Text>
                            </Text>
                        </View>
                        <View style={tw`w-14 h-14 rounded-[22px] bg-white items-center justify-center shadow-lg shadow-yellow-200 border border-white`}>
                            <Activity size={26} color="#ca8a04" />
                        </View>
                    </View>

                    {/* Live Status Card - Integrated & World Class */}
                    <View style={tw`bg-white rounded-[28px] p-5 shadow-xl shadow-yellow-600/10 border border-yellow-100/50 flex-row items-center justify-between`}>
                        <View style={tw`flex-row items-center gap-4`}>
                            <View style={tw`w-11 h-11 rounded-2xl bg-${menuStatus.color}-50 items-center justify-center`}>
                                <View style={tw`w-2 h-2 rounded-full bg-${menuStatus.color}-500`} />
                            </View>
                            <View>
                                <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5`}>{menuStatus.subLabel}</Text>
                                <Text style={tw`text-sm font-black text-gray-900`}>{menuStatus.label}</Text>
                            </View>
                        </View>
                        <Pressable
                            onPress={() => navigation.navigate('Menu')}
                            style={tw`bg-${menuStatus.color === 'red' ? 'red' : 'gray'}-900 px-4 py-2 rounded-xl`}
                        >
                            <Text style={tw`text-[10px] font-black text-white uppercase`}>Manage</Text>
                        </Pressable>
                    </View>
                </LinearGradient>
            </View>

            <ScrollView
                contentContainerStyle={tw`p-6 pt-90 pb-32`}
                style={tw`flex-1`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* 2. Cooking Summary - The LIVE Pulse */}
                {cookingSummary && (
                    <View style={tw`bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 mb-6 overflow-hidden`}>
                        <View style={tw`absolute -top-10 -right-10 w-40 h-40 bg-gray-50 rounded-full opacity-60`} />

                        <View style={tw`flex-row justify-between items-center mb-10`}>
                            <View>
                                <Text style={tw`text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1`}>Production Volume</Text>
                                <Text style={tw`text-2xl font-black text-gray-900`}>Live Breakdown</Text>
                            </View>
                            <View style={tw`bg-yellow-100/50 p-2 rounded-xl`}>
                                <Package size={20} color="#ca8a04" />
                            </View>
                        </View>

                        <View style={tw`flex-row justify-between items-center`}>
                            <View style={tw`items-center flex-1`}>
                                <Text style={tw`text-3xl font-black text-gray-900`}>{cookingSummary.halfDabba}</Text>
                                <Text style={tw`text-[10px] font-black text-gray-400 tracking-widest mt-1.5 uppercase`}>Half</Text>
                            </View>
                            <View style={tw`w-[1px] h-12 bg-gray-100`} />
                            <View style={tw`items-center flex-1`}>
                                <Text style={tw`text-3xl font-black text-gray-900`}>{cookingSummary.fullDabba}</Text>
                                <Text style={tw`text-[10px] font-black text-gray-400 tracking-widest mt-1.5 uppercase`}>Full</Text>
                            </View>
                            <View style={tw`w-[1px] h-12 bg-gray-100`} />
                            <View style={tw`items-center flex-1`}>
                                <Text style={tw`text-3xl font-black text-gray-900`}>{cookingSummary.extraRoti}</Text>
                                <Text style={tw`text-[10px] font-black text-gray-400 tracking-widest mt-1.5 uppercase`}>Extras</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 3. High Impact Navigation Stats */}
                <View style={tw`flex-row justify-between mb-2`}>
                    <Pressable
                        onPress={() => navigation.navigate('Orders')}
                        style={tw`flex-1 bg-white rounded-[32px] p-6 border border-gray-100 mr-2 shadow-sm`}
                    >
                        <View style={tw`w-10 h-10 rounded-2xl bg-orange-50 items-center justify-center mb-4`}>
                            <Clock size={18} color="#f97316" />
                        </View>
                        <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1`}>Pending Orders</Text>
                        <Text style={tw`text-2xl font-black text-gray-900`}>{stats.pendingOrders}</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => navigation.navigate('Payments')}
                        style={tw`flex-1 bg-white rounded-[32px] p-6 border border-gray-100 ml-2 shadow-sm`}
                    >
                        <View style={tw`w-10 h-10 rounded-2xl bg-emerald-50 items-center justify-center mb-4`}>
                            <IndianRupee size={18} color="#10b981" />
                        </View>
                        <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1`}>Wait Approvals</Text>
                        <Text style={tw`text-2xl font-black text-gray-900`}>{stats.pendingPayments}</Text>
                    </Pressable>
                </View>

                {/* 4. The Action Center: Quick Confirm */}
                {nextPendingOrder && (
                    <View style={tw`mt-4 bg-gray-900 rounded-[40px] p-8 shadow-xl overflow-hidden`}>
                        <View style={tw`absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full`} />

                        <View style={tw`flex-row items-center justify-between mb-6`}>
                            <View style={tw`flex-row items-center gap-2.5`}>
                                <View style={tw`w-1.5 h-1.5 rounded-full bg-yellow-400`} />
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>Action Required</Text>
                            </View>
                            <View style={tw`bg-white/10 px-3 py-1 rounded-full`}>
                                <Text style={tw`text-[9px] font-black text-white uppercase`}>Latest Order</Text>
                            </View>
                        </View>

                        <View style={tw`mb-8`}>
                            <Text style={tw`text-xl font-black text-white`}>{nextPendingOrder.userDisplayName || 'Student'}</Text>
                            <Text style={tw`text-sm font-bold text-gray-400 mt-1`}>
                                {nextPendingOrder.quantity} × {nextPendingOrder.mainItem} • <Text style={tw`text-yellow-400/80 font-black`}>{nextPendingOrder.slot?.toUpperCase()}</Text>
                            </Text>
                        </View>

                        <Pressable
                            onPress={() => handleQuickConfirm(nextPendingOrder.id)}
                            disabled={confirmingId === nextPendingOrder.id}
                            style={({ pressed }) => [
                                tw`bg-yellow-400 rounded-3xl py-5 items-center justify-center flex-row gap-3`,
                                pressed && tw`scale-98 opacity-90`
                            ]}
                        >
                            {confirmingId === nextPendingOrder.id ? (
                                <ActivityIndicator color="#111827" size="small" />
                            ) : (
                                <>
                                    <Check size={20} color="#111827" strokeWidth={3} />
                                    <Text style={tw`text-[#111827] font-black text-base uppercase tracking-tight`}>Confirm Order</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                )}

                {/* Footer Link */}
                <Pressable
                    onPress={() => navigation.navigate('Orders')}
                    style={tw`mt-8 items-center py-4`}
                >
                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]`}>View All Activity ➔</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
};
