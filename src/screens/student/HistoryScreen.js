import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import tw from 'twrnc';
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
    const { user } = useAuth();
    const { tenant } = useTenant();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monthFilter, setMonthFilter] = useState("THIS_MONTH"); // ALL | THIS_MONTH
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!user || !tenant) return;

        // Note: Using 'kitchens/{kitchenId}/orders' as per previous context, 
        // OR top-level 'orders' collection if that's how it's set up.
        // User's provided code used `collection(db, "orders")`, but in this multi-tenant app 
        // we likely use `kitchens/{id}/orders`. Let's stick to the pattern used in HomeScreen/paymentService.
        // HomeScreen used: `collection(db, 'kitchens', tenant.id, 'orders')`

        const q = query(
            collection(db, 'kitchens', tenant.id, 'orders'),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
            }));
            setOrders(list);
            setLoading(false);
            setRefreshing(false);
        }, (err) => {
            console.error("Orders fetch error", err);
            setLoading(false);
            setRefreshing(false);
        });

        return () => unsub();
    }, [user?.uid, tenant?.id]);

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
            {/* Header */}
            <View style={tw`px-6 pt-14 pb-6 bg-white`}>
                <Text style={tw`text-2xl font-bold text-gray-900`}>My Thali History</Text>
                <Text style={tw`text-sm text-gray-500 mt-1`}>Your meals & spending at a glance</Text>
            </View>

            <ScrollView
                contentContainerStyle={tw`p-6 pb-24`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats */}
                <View style={tw`flex-row gap-4 mb-8`}>
                    <View style={tw`flex-1 bg-white rounded-3xl p-5 shadow-sm border border-gray-100`}>
                        <Text style={tw`text-[10px] font-bold uppercase tracking-wide text-gray-400`}>Monthly Spend</Text>
                        <Text style={tw`mt-1 text-2xl font-black text-gray-900`}>₹{totalExpense}</Text>
                    </View>
                    <View style={tw`flex-1 bg-yellow-50 rounded-3xl p-5 border border-yellow-100`}>
                        <Text style={tw`text-[10px] font-bold uppercase tracking-wide text-yellow-800`}>Tiffins This Month</Text>
                        <Text style={tw`mt-1 text-2xl font-black text-yellow-900`}>{totalTiffins}</Text>
                    </View>
                </View>

                {/* Filter */}
                <View style={tw`flex-row gap-2 mb-8`}>
                    {[
                        { key: "ALL", label: "All Orders" },
                        { key: "THIS_MONTH", label: "This Month" },
                    ].map(f => (
                        <Pressable
                            key={f.key}
                            onPress={() => setMonthFilter(f.key)}
                            style={[
                                tw`px-4 py-2 rounded-full border`,
                                monthFilter === f.key
                                    ? tw`bg-yellow-400 border-yellow-400`
                                    : tw`bg-white border-gray-200`
                            ]}
                        >
                            <Text style={[
                                tw`text-xs font-bold`,
                                monthFilter === f.key ? tw`text-gray-900` : tw`text-gray-500`
                            ]}>{f.label}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Orders List */}
                {["today", "yesterday", "older"].map(key => (
                    groupedOrders[key].length > 0 && (
                        <View key={key} style={tw`mb-8`}>
                            <Text style={tw`mb-4 text-xs font-black uppercase tracking-widest text-gray-400`}>{key}</Text>
                            {groupedOrders[key].map(o => {
                                const { day, month } = formatDayPill(o.createdAt);
                                // Adjust fields based on actual data
                                // Web: o.items?.item (name), o.items?.quantity, o.items?.unitPrice
                                // App: o.items is array. For single item card:
                                const mainItem = o.items ? o.items[0] : {};
                                const itemName = mainItem.name || o.mealType || "Thali";
                                const qty = mainItem.quantity || o.quantity || 1;
                                const itemPrice = mainItem.price || o.price || 0;
                                const total = o.totalAmount || (qty * itemPrice);

                                return (
                                    <View key={o.id} style={tw`bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex-row gap-4 mb-4`}>
                                        {/* Date Pill */}
                                        <View style={tw`w-14 h-16 rounded-2xl bg-gray-50 items-center justify-center border border-gray-100 self-start`}>
                                            <Text style={tw`text-[10px] font-bold tracking-wide text-gray-400 uppercase`}>{month}</Text>
                                            <Text style={tw`text-xl font-bold text-gray-900`}>{day}</Text>
                                        </View>

                                        {/* Content */}
                                        <View style={tw`flex-1`}>
                                            <View style={tw`flex-row justify-between items-start mb-2`}>
                                                <View>
                                                    <Text style={tw`text-xs text-gray-400 uppercase font-bold mb-0.5`}>{o.mealType}</Text>
                                                    <Text style={tw`font-bold text-gray-900 text-base`}>{itemName}</Text>
                                                    <Text style={tw`text-xs text-gray-500 mt-0.5`}>{qty} × ₹{itemPrice}</Text>
                                                </View>
                                                <View style={tw`items-end`}>
                                                    <Text style={tw`text-lg font-black text-gray-900`}>₹{total}</Text>
                                                    <View style={[tw`px-2 py-0.5 rounded-full mt-1`, statusStyle(o.status)]}>
                                                        <Text style={[tw`text-[10px] font-bold uppercase`, statusTextStyle(o.status)]}>{o.status}</Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {o.status === "PENDING" && (
                                                <Text style={tw`text-xs text-red-500 font-medium`}>Order cannot be changed after confirmation</Text>
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )
                ))}

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
