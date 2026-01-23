import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { listenToAdminStats, getCookingSummary } from '../../services/adminService';
import { subscribeToMenu, getEffectiveMenuDateKey, getEffectiveMealSlot, getAvailableSlots } from '../../services/menuService';
import { subscribeToOrders, updateOrder } from '../../services/orderService';
import tw from 'twrnc';
import { Clock, IndianRupee, Package, ChevronRight, Activity, Check, Sun, Moon, AlertTriangle, CheckCircle, Coffee, UtensilsCrossed } from 'lucide-react-native';
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

    const initialSlot = useMemo(() => getEffectiveMealSlot(tenant), [tenant]);
    const [manualSlot, setManualSlot] = useState(null);
    const slot = manualSlot || initialSlot;
    const dateKey = useMemo(() => getEffectiveMenuDateKey(tenant), [tenant]);

    const enabledSlots = useMemo(() => {
        if (!tenant?.mealSlots) return [];
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        return Object.entries(tenant.mealSlots)
            .filter(([_, s]) => s.active && currentTime <= s.end) // Only show slots that haven't ended
            .map(([id, s]) => ({ id, ...s }))
            .sort((a, b) => a.start.localeCompare(b.start));
    }, [tenant]);

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
        const activeOrders = orders.filter(o => o.slot === slot);
        return getCookingSummary(activeOrders, menuData?.[slot]);
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
        if (!slotData) return { label: `${slot.toUpperCase()} Menu Not Set`, color: "red", subLabel: "" };
        const mainItem = slotData.type === 'ROTI_SABZI' ? slotData.rotiSabzi?.sabzi : slotData.other?.name;
        return { label: "Ready to Serve", color: "yellow", subLabel: mainItem };
    }, [menuData, slot]);

    const SlotIcon = useMemo(() => {
        if (!slot) return Clock; // Default icon for off hours
        if (slot === 'breakfast') return Coffee;
        if (slot === 'lunch') return Sun;
        if (slot === 'snacks') return UtensilsCrossed;
        return Moon;
    }, [slot]);

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
                            <Text style={tw`text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-1`}>{todayStr}</Text>
                            <Text style={tw`text-3xl font-black text-gray-900 leading-tight`}>
                                Kitchen{"\n"}
                                <Text style={tw`text-yellow-600`}>Dashboard</Text>
                            </Text>
                        </View>
                        <View style={tw`w-14 h-14 rounded-[22px] bg-white items-center justify-center shadow-lg shadow-yellow-200 border border-white`}>
                            <Activity size={26} color="#ca8a04" />
                        </View>
                    </View>

                    {/* Live Status Card - Dashboard Redesign */}
                    <Pressable onPress={() => navigation.navigate('Menu')}>
                        <LinearGradient
                            colors={
                                menuStatus.color === 'red' ? ['#450a0a', '#7f1d1d'] :
                                    menuStatus.color === 'gray' ? ['#334155', '#1e293b'] : // Slate/Gray for Off Hours
                                        ['#064e3b', '#059669']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={tw`rounded-3xl p-5 shadow-lg flex-row items-center justify-between border border-white/10`}
                        >
                            <View style={tw`flex-row items-center gap-4 flex-1`}>
                                <View style={tw`w-12 h-12 rounded-2xl bg-white/10 items-center justify-center border border-white/5`}>
                                    <SlotIcon size={22} color="#fbbf24" fill={slot === 'dinner' || slot === 'snacks' ? "#fbbf24" : "transparent"} />
                                </View>
                                <View style={tw`flex-1`}>

                                    <Text style={tw`text-2xl font-black text-white capitalize`}>{slot || 'Resting'}</Text>
                                    <Text style={tw`text-[10px] text-white/80 font-medium`} numberOfLines={1}>
                                        {menuStatus.color === 'red' ? 'Upload menu' : (slot ? 'Menu is live • Receiving orders' : 'Waiting for next slot...')}
                                    </Text>
                                </View>
                            </View>

                            <View style={tw`items-end pl-2`}>
                                {menuStatus.color === 'red' ? (
                                    <>
                                        <View style={tw`flex-row items-center gap-1.5 mb-0.5`}>
                                            <AlertTriangle size={14} color="#fca5a5" />
                                            <Text style={tw`text-xs font-bold text-red-100`}>Missing</Text>
                                        </View>
                                        <Text style={tw`text-[9px] text-white/40`}>Not Uploaded</Text>
                                    </>
                                ) : menuStatus.color === 'gray' ? (
                                    <>
                                        <View style={tw`flex-row items-center gap-1.5 mb-0.5`}>
                                            <Clock size={14} color="#cbd5e1" />
                                            <Text style={tw`text-xs font-bold text-slate-100`}>Resting</Text>
                                        </View>
                                        <Text style={tw`text-[9px] text-white/40`}>Off Hours</Text>
                                    </>
                                ) : (
                                    <>
                                        <View style={tw`flex-row items-center gap-1.5 mb-0.5`}>
                                            <CheckCircle size={14} color="#a7f3d0" />
                                            <Text style={tw`text-xs font-bold text-emerald-100`}>Active</Text>
                                        </View>
                                        <Text style={tw`text-[9px] text-white/40`}>{orders.length} orders</Text>
                                    </>
                                )}
                            </View>
                        </LinearGradient>
                    </Pressable>

                    {/* Slot Switcher - For Overlap Resolution */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={tw`mt-6`}
                        contentContainerStyle={tw`px-1`}
                    >
                        {enabledSlots.map(s => {
                            const isSelected = slot === s.id;
                            const Icon = s.id === 'breakfast' ? Coffee : (s.id === 'lunch' ? Sun : (s.id === 'snacks' ? UtensilsCrossed : Moon));
                            return (
                                <Pressable
                                    key={s.id}
                                    onPress={() => setManualSlot(s.id)}
                                    style={[
                                        tw`flex-row items-center gap-2 px-5 py-2.5 rounded-2xl mr-3 border`,
                                        isSelected
                                            ? tw`bg-yellow-400 border-yellow-400 shadow-md shadow-yellow-100`
                                            : tw`bg-white border-white`
                                    ]}
                                >
                                    <Icon size={12} color={isSelected ? "#111827" : "#9ca3af"} />
                                    <Text style={[
                                        tw`text-[9px] font-black uppercase tracking-widest`,
                                        isSelected ? tw`text-gray-900` : tw`text-gray-400`
                                    ]}>{s.id}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </LinearGradient>
            </View>

            <ScrollView
                contentContainerStyle={tw`p-6 pt-105 pb-32`}
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
                            {(cookingSummary?.halfDabba > 0 || cookingSummary?.fullDabba > 0) && (
                                <>
                                    <View style={tw`items-center flex-1`}>
                                        <Text style={tw`text-3xl font-black text-gray-900`}>{cookingSummary?.halfDabba || 0}</Text>
                                        <Text style={tw`text-[10px] font-black text-gray-400 tracking-widest mt-1.5 uppercase`}>Half</Text>
                                    </View>
                                    <View style={tw`w-[1px] h-12 bg-gray-100`} />
                                    <View style={tw`items-center flex-1`}>
                                        <Text style={tw`text-3xl font-black text-gray-900`}>{cookingSummary?.fullDabba || 0}</Text>
                                        <Text style={tw`text-[10px] font-black text-gray-400 tracking-widest mt-1.5 uppercase`}>Full</Text>
                                    </View>
                                </>
                            )}

                            {((cookingSummary?.halfDabba > 0 || cookingSummary?.fullDabba > 0) && Object.keys(cookingSummary?.breakdown || {}).length > 0) && (
                                <View style={tw`w-[1px] h-12 bg-gray-100`} />
                            )}

                            {Object.entries(cookingSummary?.breakdown || {}).map(([name, count], idx, arr) => (
                                <React.Fragment key={name}>
                                    <View style={tw`items-center flex-1`}>
                                        <Text style={tw`text-3xl font-black text-gray-900`}>{count || 0}</Text>
                                        <Text style={[tw`text-[10px] font-black text-gray-400 tracking-widest mt-1.5 uppercase`, { width: '80%', textAlign: 'center' }]} numberOfLines={1}>{name}</Text>
                                    </View>
                                    {(idx < arr.length - 1 || cookingSummary?.extraRoti > 0) && <View style={tw`w-[1px] h-12 bg-gray-100`} />}
                                </React.Fragment>
                            ))}

                            {Object.entries(cookingSummary?.extrasBreakdown || {}).map(([name, count], idx, arr) => (
                                <React.Fragment key={name}>
                                    {((cookingSummary?.halfDabba > 0 || cookingSummary?.fullDabba > 0 || Object.keys(cookingSummary?.breakdown || {}).length > 0) || idx > 0) && (
                                        <View style={tw`w-[1px] h-12 bg-gray-100`} />
                                    )}
                                    <View style={tw`items-center flex-1`}>
                                        <Text style={tw`text-3xl font-black text-gray-900`}>{count || 0}</Text>
                                        <Text style={[tw`text-[10px] font-black text-gray-400 tracking-widest mt-1.5 uppercase`, { width: '80%', textAlign: 'center' }]} numberOfLines={1}>{name}</Text>
                                    </View>
                                </React.Fragment>
                            ))}
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
                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>View All Activity ➔</Text>
                </Pressable>
            </ScrollView>
        </View>
    );
};
