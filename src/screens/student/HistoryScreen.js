import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { subscribeToMyOrders } from '../../services/orderService';

import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, CheckCircle, Package } from 'lucide-react-native';

const normalizeDate = (ts) => (ts?.toDate ? ts.toDate() : new Date(ts));

const isToday = (ts) => normalizeDate(ts).toDateString() === new Date().toDateString();

const isYesterday = (ts) => {
    const d = normalizeDate(ts);
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
};

const sameMonth = (ts) => {
    const d = normalizeDate(ts);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

const formatDayPill = (ts) => {
    const d = normalizeDate(ts);
    return {
        day: d.getDate(),
        month: d.toLocaleString("default", { month: "short" }).toUpperCase(),
    };
};

const statusStyle = (status) => {
    // Return tw style object or array
    switch (status) {
        case "DELIVERED": return tw`text-green-600 bg-green-50`;
        case "CONFIRMED": return tw`text-blue-600 bg-blue-50`;
        case "COOKING": return tw`text-orange-600 bg-orange-50`;
        case "CANCELLED": return tw`text-red-600 bg-red-50`;
        default: return tw`text-gray-500 bg-gray-100`;
    }
};

const statusTextStyle = (status) => {
    switch (status) {
        case "DELIVERED": return tw`text-green-700`;
        case "CONFIRMED": return tw`text-blue-700`;
        case "COOKING": return tw`text-orange-700`;
        case "CANCELLED": return tw`text-red-700`;
        default: return tw`text-gray-600`;
    }
}

export const HistoryScreen = () => {
    const { user, userProfile } = useAuth();
    const { tenant } = useTenant();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monthFilter, setMonthFilter] = useState("THIS_MONTH"); // ALL | THIS_MONTH
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!user || !tenant) return;

        const unsub = subscribeToMyOrders(tenant.id, user.uid, userProfile?.phoneNumber, (list) => {
            setOrders(list);
            setLoading(false);
            setRefreshing(false);
        });

        return () => unsub();
    }, [user?.uid, tenant?.id, userProfile?.phoneNumber]);

    const filteredOrders = useMemo(() => {
        if (monthFilter === "ALL") return orders;
        return orders.filter(o => sameMonth(o.createdAt));
    }, [orders, monthFilter]);

    // Grouping
    const groupedOrders = { today: [], yesterday: [], older: [] };
    filteredOrders.forEach(o => {
        if (isToday(o.createdAt)) groupedOrders.today.push(o);
        else if (isYesterday(o.createdAt)) groupedOrders.yesterday.push(o);
        else groupedOrders.older.push(o);
    });

    // Stats
    const monthlyOrders = orders.filter(
        o => sameMonth(o.createdAt) && (o.status === "CONFIRMED" || o.status === "DELIVERED")
    );

    const totalExpense = monthlyOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    // Note: totalAmount usually includes (price * qty), simplified here. 
    // If logic differs (e.g. items array), adapt. 
    // In HomeScreen logic: placeStudentOrder saves 'totalAmount'.

    const totalTiffins = monthlyOrders.reduce((sum, o) => {
        // Assuming quantity is stored. In web code: o.items?.quantity.
        // Let's assume 'quantity' field exists or check data structure.
        // In PlaceOrder logic (Service): orderData = { ... items: [{... quantity }] ... }
        // So we sum up item quantities.
        const qty = o.items ? o.items.reduce((qSum, i) => qSum + (Number(i.quantity) || 0), 0) : (o.quantity || 0);
        return sum + qty;
    }, 0);

    const onRefresh = () => {
        setRefreshing(true);
        // Snapshot listener updates auto, but we can simulate a delay or just let it be.
        setTimeout(() => setRefreshing(false), 1000);
    };

    if (loading) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><ActivityIndicator color="#ca8a04" /></View>;

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Header - Continuity */}
            <LinearGradient
                colors={['#fff', '#faf9f6']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={tw`px-6 pt-14 pb-8 rounded-b-[40px] shadow-sm border-b border-gray-100/50`}
            >
                <Text style={tw`text-2xl font-black text-gray-900`}>Meal History</Text>
                <Text style={tw`text-yellow-600 text-[9px] font-black uppercase tracking-widest mt-0.5`}>Past Orders & Consumption</Text>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={tw`p-6 pb-32 mt-7`}
                style={tw`flex-1 -mt-4`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats - Premium Glassy Cards */}
                <View style={tw`flex-row gap-4 mb-8`}>
                    <View style={tw`flex-1 bg-white rounded-3xl p-6 shadow-sm border border-gray-100`}>
                        <Text style={tw`text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1`}>Monthly Spend</Text>
                        <Text style={tw`text-3xl font-black text-gray-900`}>₹{totalExpense}</Text>
                    </View>
                    <View style={tw`flex-1 bg-yellow-400 rounded-3xl p-6 shadow-md shadow-yellow-200`}>
                        <Text style={tw`text-[9px] font-black uppercase tracking-widest text-yellow-800 mb-1`}>Tiffins</Text>
                        <Text style={tw`text-3xl font-black text-gray-900`}>{totalTiffins}</Text>
                    </View>
                </View>

                {/* Filter - Modern Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row gap-2 mb-8`}>
                    {[
                        { key: "ALL", label: "All Time" },
                        { key: "THIS_MONTH", label: "This Month" },
                    ].map(f => (
                        <Pressable
                            key={f.key}
                            onPress={() => setMonthFilter(f.key)}
                            style={[
                                tw`px-6 py-2.5 rounded-xl border mr-2`,
                                monthFilter === f.key
                                    ? tw`bg-gray-900 border-gray-900`
                                    : tw`bg-white border-gray-100`
                            ]}
                        >
                            <Text style={[
                                tw`text-[10px] font-black uppercase tracking-widest`,
                                monthFilter === f.key ? tw`text-white` : tw`text-gray-400`
                            ]}>{f.label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* Orders List */}
                {["today", "yesterday", "older"].map(key =>
                    groupedOrders[key].length > 0 ? (
                        <View key={key} style={tw`mb-8`}>
                            <Text style={tw`mb-4 text-xs font-black uppercase tracking-widest text-gray-400`}>{key}</Text>
                            {groupedOrders[key].map(o => {
                                const { day, month } = formatDayPill(o.createdAt);
                                const slotLabel = (o.slot || o.mealType || 'Manual').charAt(0).toUpperCase() + (o.slot || o.mealType || 'Manual').slice(1);
                                const itemName = o.orderDescription || o.mainItem || (o.type === 'ROTI_SABZI' ? 'Roti Sabzi' : slotLabel);
                                const qty = o.quantity || 1;
                                const total = o.totalAmount || 0;
                                const itemPrice = o.price || (qty > 0 ? (total / qty) : 0);

                                return (
                                    <View key={o.id} style={tw`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex-row gap-4 mb-3 items-center`}>
                                        {/* Date Icon */}
                                        <View style={tw`w-12 h-12 rounded-xl bg-gray-50 items-center justify-center border border-gray-50`}>
                                            <Text style={tw`text-[8px] font-black text-gray-300 uppercase`}>{month}</Text>
                                            <Text style={tw`text-lg font-black text-gray-900 mt-[-2px]`}>{day}</Text>
                                        </View>

                                        {/* Content */}
                                        <View style={tw`flex-1`}>
                                            <View style={tw`flex-row justify-between items-start`}>
                                                <View>
                                                    <View style={tw`flex-row items-center gap-1.5 mb-0.5`}>
                                                        <Text style={tw`text-[8px] font-black text-yellow-600 uppercase tracking-widest`}>{slotLabel}</Text>
                                                        {o.isPriority && (
                                                            <View style={tw`bg-orange-100 px-1.5 py-0.5 rounded-md`}>
                                                                <Text style={tw`text-[7px] font-black text-orange-600 uppercase`}>Priority</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                    <Text style={tw`font-black text-gray-900 text-sm`}>{itemName}</Text>
                                                    <Text style={tw`text-[9px] font-bold text-gray-400 mt-0.5 uppercase`}>{qty} × ₹{itemPrice}</Text>
                                                </View>
                                                <View style={tw`items-end`}>
                                                    <Text style={tw`text-base font-black text-gray-900 mb-1`}>₹{total}</Text>
                                                    <View style={[tw`px-2 py-0.5 rounded-lg`, statusStyle(o.status)]}>
                                                        <Text style={[tw`text-[8px] font-black uppercase tracking-widest`, statusTextStyle(o.status)]}>{o.status}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : null
                )}

                {filteredOrders.length === 0 && (
                    <View style={tw`items-center justify-center py-10`}>
                        <Package size={40} color="#e5e7eb" />
                        <Text style={tw`text-gray-400 font-bold mt-4`}>No orders found</Text>
                    </View>
                )}

            </ScrollView>
        </View>
    );
};
