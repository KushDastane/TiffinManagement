import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { subscribeToOrders, updateOrder } from '../../services/orderService';
import { getTodayKey } from '../../services/menuService';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Clock, Check, ChevronRight, User, Package, Filter } from 'lucide-react-native';

export const OrdersScreen = () => {
    const { tenant } = useTenant();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PENDING | CONFIRMED
    const [refreshing, setRefreshing] = useState(false);
    const [confirmingId, setConfirmingId] = useState(null);

    const today = getTodayKey();

    useEffect(() => {
        if (!tenant?.id) return;
        setLoading(true);
        const unsub = subscribeToOrders(tenant.id, today, (list) => {
            setOrders(list);
            setLoading(false);
            setRefreshing(false);
        });
        return unsub;
    }, [tenant?.id, today]);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = !searchTerm || (o.userDisplayName || 'Student').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'ALL' ||
                (statusFilter === 'PENDING' && o.status === 'PENDING') ||
                (statusFilter === 'CONFIRMED' && o.status === 'CONFIRMED') ||
                (statusFilter === 'COMPLETED' && o.status === 'COMPLETED');
            return matchesSearch && matchesStatus;
        });
    }, [orders, searchTerm, statusFilter]);

    const handleConfirm = async (orderId) => {
        setConfirmingId(orderId);
        const result = await updateOrder(tenant.id, orderId, { status: 'CONFIRMED' });
        setConfirmingId(null);
        if (result.error) Alert.alert("Error", result.error);
    };

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    if (loading) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><ActivityIndicator color="#ca8a04" /></View>;

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Absolute Creative Header - Fixed & Sticky */}
            <View style={tw`absolute pb-3 top-0 left-0 right-0 z-10`}>
                <LinearGradient
                    colors={['#fff', '#faf9f6']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={tw`px-6 pt-16 pb-6 rounded-b-[45px] shadow-sm border-b border-gray-100/50`}
                >
                    <View style={tw`mb-4`}>
                        <Text style={tw`text-2xl font-black text-gray-900`}>Daily Orders</Text>
                        <Text style={tw`text-yellow-600 text-[9px] font-black uppercase tracking-widest mt-0.5`}>Confirm & Batch Production</Text>
                    </View>

                    {/* Sticky Controls */}
                    <View style={tw`gap-4`}>
                        {/* Search */}
                        <View style={tw`bg-white rounded-2xl flex-row items-center px-4 shadow-sm border border-gray-100`}>
                            <Search size={16} color="#9ca3af" strokeWidth={2.5} />
                            <TextInput
                                style={tw`flex-1 py-3 ml-2 font-bold text-gray-900 text-sm`}
                                placeholder="Search student identity..."
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                            />
                        </View>

                        {/* Filters */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row`}>
                            {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED'].map(f => (
                                <Pressable
                                    key={f}
                                    onPress={() => setStatusFilter(f)}
                                    style={[tw`px-5 py-2 rounded-xl border mr-2`, statusFilter === f ? tw`bg-gray-900 border-gray-900` : tw`bg-white border-gray-100`]}
                                >
                                    <Text style={[tw`text-[9px] font-black uppercase tracking-widest`, statusFilter === f ? tw`text-white` : tw`text-gray-400`]}>{f}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </LinearGradient>
            </View>

            <ScrollView
                style={tw`flex-1`}
                contentContainerStyle={tw`p-6 pt-68 pb-64`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >

                <View style={tw`gap-4`}>
                    {filteredOrders.map(o => {
                        const isConfirmed = o.status === 'CONFIRMED';
                        const isPriority = o.isPriority === true;

                        return (
                            <View
                                key={o.id}
                                style={[
                                    tw`bg-white rounded-[30px] p-6 shadow-sm border mb-4`,
                                    // Simplified border logic: Removed opaque background overlays that cause weird outlines
                                    o.status === 'COMPLETED' ? tw`border-emerald-200` : (isConfirmed ? tw`border-gray-50` : (isPriority ? tw`border-orange-200` : tw`border-yellow-200`))
                                ]}
                            >
                                {isPriority && (
                                    <View style={tw`absolute -top-3 -right-2 bg-orange-500 px-3 py-1 rounded-full shadow-lg z-20 flex-row items-center gap-1.5`}>
                                        <Clock size={10} color="white" />
                                        <Text style={tw`text-white text-[8px] font-black uppercase tracking-widest`}>Early Collection</Text>
                                    </View>
                                )}
                                <View style={tw`flex-row justify-between items-start mb-6`}>
                                    <View style={tw`flex-row items-center gap-3`}>
                                        <View style={[tw`w-10 h-10 rounded-2xl items-center justify-center`, o.status === 'COMPLETED' ? tw`bg-emerald-100` : (isConfirmed ? tw`bg-gray-100` : (isPriority ? tw`bg-orange-100` : tw`bg-yellow-100`))]}>
                                            {o.status === 'COMPLETED' ? <Check size={18} color="#059669" /> : (isConfirmed ? <Check size={18} color="#4b5563" /> : (isPriority ? <Clock size={18} color="#ea580c" /> : <Clock size={18} color="#ca8a04" />))}
                                        </View>
                                        <View>
                                            <Text style={tw`text-base font-black text-gray-900`}>{o.userDisplayName || 'Student'}</Text>
                                            <View style={tw`flex-row items-center gap-1`}>
                                                <User size={10} color="#9ca3af" />
                                                <Text style={tw`text-[10px] font-bold text-gray-400 uppercase`}>{o.slot} • {o.type?.replace('_', ' ')}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <View style={tw`flex-row gap-2`}>
                                        {isPriority && <View style={tw`bg-orange-100 px-2 py-1 rounded-full`}><Text style={tw`text-[8px] font-black text-orange-700 uppercase`}>Priority</Text></View>}
                                        {!isConfirmed && o.status !== 'COMPLETED' && <View style={tw`bg-yellow-100 px-3 py-1 rounded-full`}><Text style={tw`text-[10px] font-black text-yellow-800 uppercase`}>Pending</Text></View>}
                                        {o.status === 'COMPLETED' && <View style={tw`bg-emerald-100 px-3 py-1 rounded-full`}><Text style={tw`text-[10px] font-black text-emerald-800 uppercase`}>Done</Text></View>}
                                    </View>
                                </View>

                                <View style={tw`bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-4`}>
                                    <Text style={tw`text-xs font-black text-gray-900`}>{o.quantity} × {o.mainItem}</Text>
                                    {o.componentsSnapshot && o.componentsSnapshot.length > 0 && (
                                        <Text style={tw`text-[10px] text-gray-400 mt-1`}>Extras: {o.componentsSnapshot.map(c => `${c.name} x${c.quantity}`).join(', ')}</Text>
                                    )}
                                </View>

                                {!isConfirmed && o.status !== 'COMPLETED' ? (
                                    <Pressable
                                        onPress={() => handleConfirm(o.id)}
                                        disabled={confirmingId === o.id}
                                        style={[
                                            tw`rounded-2xl py-3 items-center justify-center flex-row gap-2`,
                                            isPriority ? tw`bg-orange-500` : tw`bg-yellow-400`
                                        ]}
                                    >
                                        {confirmingId === o.id ? <ActivityIndicator color={isPriority ? "#fff" : "#111827"} size="small" /> : (
                                            <>
                                                <Text style={[tw`font-black text-sm uppercase`, isPriority ? tw`text-white` : tw`text-gray-900`]}>Confirm Order</Text>
                                                <ChevronRight size={18} color={isPriority ? "white" : "#111827"} />
                                            </>
                                        )}
                                    </Pressable>
                                ) : (
                                    o.status !== 'COMPLETED' ? (
                                        <Pressable
                                            onPress={async () => {
                                                setConfirmingId(o.id);
                                                await updateOrder(tenant.id, o.id, { status: 'COMPLETED' });
                                                setConfirmingId(null);
                                            }}
                                            disabled={confirmingId === o.id}
                                            style={tw`bg-emerald-500 rounded-2xl py-3 items-center justify-center flex-row gap-2 shadow-sm`}
                                        >
                                            {confirmingId === o.id ? <ActivityIndicator color="white" size="small" /> : (
                                                <>
                                                    <Check size={16} color="white" />
                                                    <Text style={tw`font-black text-sm uppercase text-white`}>Mark as Ready</Text>
                                                </>
                                            )}
                                        </Pressable>
                                    ) : (
                                        <View style={tw`flex-row items-center gap-2 mt-2 w-full justify-center`}>
                                            <Check size={14} color="#059669" />
                                            <Text style={tw`text-[10px] font-bold text-emerald-600 uppercase`}>Ready for Collection</Text>
                                        </View>
                                    )
                                )}
                            </View>
                        );
                    })}

                    {filteredOrders.length === 0 && (
                        <View style={tw`items-center justify-center py-20`}>
                            <Package size={48} color="#e5e7eb" />
                            <Text style={tw`text-gray-400 font-black mt-4`}>No orders found</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};
