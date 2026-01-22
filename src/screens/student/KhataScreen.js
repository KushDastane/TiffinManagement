import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { getStudentBalance } from "../../services/paymentService";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from "../../contexts/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Plus,
    Filter,
} from 'lucide-react-native';

const LedgerEntryCard = ({ type, amount, label, date }) => {
    const isCredit = type === "CREDIT";
    return (
        <View style={tw`bg-white rounded-2xl p-4 flex-row justify-between items-center mb-3 border border-gray-100 shadow-sm/30`}>
            <View style={tw`flex-row items-center gap-3`}>
                <View style={[
                    tw`w-10 h-10 rounded-xl items-center justify-center`,
                    isCredit ? tw`bg-green-50` : tw`bg-red-50`
                ]}>
                    {isCredit ? (
                        <ArrowDownLeft size={18} color="#059669" />
                    ) : (
                        <ArrowUpRight size={18} color="#dc2626" />
                    )}
                </View>
                <View>
                    <Text style={tw`text-sm font-black text-gray-900`}>{label}</Text>
                    <Text style={tw`text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5`}>{date}</Text>
                </View>
            </View>

            <View style={tw`items-end`}>
                <Text style={[
                    tw`text-base font-black`,
                    isCredit ? tw`text-emerald-700` : tw`text-red-700`
                ]}>
                    {isCredit ? "+" : "-"} ₹{amount}
                </Text>
            </View>
        </View>
    );
};

export const KhataScreen = () => {
    const { user } = useAuth();
    const { tenant } = useTenant();
    const { primaryColor } = useTheme();
    const navigation = useNavigation();

    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [ledger, setLedger] = useState([]); // Confirmed transactions (mix of orders & verified payments)
    const [payments, setPayments] = useState([]); // Raw payments collection (includes PENDING/REJECTED)
    const [filter, setFilter] = useState("all");
    const [refreshing, setRefreshing] = useState(false);

    // Helpers
    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return d.toLocaleDateString("en-IN", { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const normalizeDate = (ts) => (ts?.toDate ? ts.toDate() : new Date(ts));
    const isToday = (ts) => normalizeDate(ts).toDateString() === new Date().toDateString();
    const isYesterday = (ts) => {
        const d = normalizeDate(ts);
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return d.toDateString() === y.toDateString();
    };

    const loadData = async () => {
        if (!tenant?.id || !user?.uid) return;
        setLoading(true);
        try {
            const summaryData = await getStudentBalance(tenant.id, user.uid);
            setSummary(summaryData);

            const combinedLedger = [
                ...summaryData.orders.map(o => ({ ...o, source: "ORDER", type: "DEBIT", itemType: "verified" })),
                ...summaryData.payments.map(p => ({ ...p, source: "PAYMENT", type: "CREDIT", itemType: "verified" }))
            ];
            setLedger(combinedLedger);

        } catch (e) {
            console.error("Khata load error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!tenant?.id || !user?.uid) return;
        loadData();

        const q = query(
            collection(db, "kitchens", tenant.id, "payments"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPayments(list);
        });

        return () => unsub();
    }, [tenant?.id, user?.uid]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const pendingPayments = payments.filter(p => p.status === "pending");
    const rejectedPayments = payments.filter(p => p.status === "rejected");

    const allItems = [
        ...pendingPayments.map(p => ({ ...p, itemType: "pending", type: "CREDIT" })),
        ...rejectedPayments.map(p => ({ ...p, itemType: "rejected", type: "CREDIT" })),
        ...ledger
    ];

    const filteredItems = filter === "all" ? allItems : allItems.filter(i => i.itemType === filter);

    const groupedItems = { today: [], yesterday: [], older: [] };
    const typeOrder = { rejected: 0, pending: 1, verified: 2 };

    filteredItems.sort((a, b) => {
        if (typeOrder[a.itemType] !== typeOrder[b.itemType]) {
            return typeOrder[a.itemType] - typeOrder[b.itemType];
        }
        return normalizeDate(b.createdAt || b.date) - normalizeDate(a.createdAt || a.date);
    });

    filteredItems.forEach(item => {
        const date = item.createdAt || item.date;
        if (isToday(date)) groupedItems.today.push(item);
        else if (isYesterday(date)) groupedItems.yesterday.push(item);
        else groupedItems.older.push(item);
    });

    if (loading && !summary) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><ActivityIndicator color="#ca8a04" /></View>;

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Header - Continuity */}
            <LinearGradient
                colors={['#fff', '#faf9f6']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={tw`px-6 pt-14 pb-8 rounded-b-[40px] shadow-sm border-b border-gray-100/50`}
            >
                <Text style={tw`text-2xl font-black text-gray-900`}>My Ledger</Text>
                <Text style={tw`text-yellow-600 text-[9px] font-black uppercase tracking-widest mt-0.5`}>Transaction History & Dues</Text>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={tw`p-6 pb-32`}
                style={tw`flex-1 -mt-4`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Card - High Impact */}
                <View style={tw`bg-white rounded-3xl p-7 shadow-sm border border-gray-100 mb-6 overflow-hidden`}>
                    <View style={tw`flex-row justify-between items-start`}>
                        <View>
                            <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1`}>Available Balance</Text>
                            <Text style={[
                                tw`text-4xl font-black`,
                                (summary?.balance || 0) < 0 ? tw`text-red-600` : tw`text-emerald-600`
                            ]}>
                                ₹{summary?.balance || 0}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => navigation.navigate("AddPayment")}
                            style={tw`w-10 h-10 rounded-xl bg-yellow-400 items-center justify-center shadow-md shadow-yellow-200`}
                        >
                            <Plus size={20} color="black" strokeWidth={3} />
                        </Pressable>
                    </View>

                    <View style={tw`flex-row gap-6 mt-6 pt-6 border-t border-gray-50`}>
                        <View>
                            <Text style={tw`text-[8px] font-black text-gray-300 uppercase tracking-widest`}>Total Pay</Text>
                            <Text style={tw`text-sm font-black text-gray-900`}>₹{summary?.totalPaid || 0}</Text>
                        </View>
                        <View>
                            <Text style={tw`text-[8px] font-black text-gray-300 uppercase tracking-widest`}>Total Spent</Text>
                            <Text style={tw`text-sm font-black text-gray-900`}>₹{summary?.totalOrders || 0}</Text>
                        </View>
                    </View>
                </View>

                {/* Filters - Minimal Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`flex-row gap-2 mb-8`}>
                    {[
                        { key: "all", label: "History" },
                        { key: "verified", label: "Confirmed" },
                        { key: "pending", label: "Pending" },
                        { key: "rejected", label: "Rejected" },
                    ].map(({ key, label }) => (
                        <Pressable
                            key={key}
                            onPress={() => setFilter(key)}
                            style={[
                                tw`px-5 py-2.5 rounded-xl border mr-2`,
                                filter === key
                                    ? tw`bg-gray-900 border-gray-900`
                                    : tw`bg-white border-gray-100`
                            ]}
                        >
                            <Text style={[
                                tw`text-[10px] font-black uppercase tracking-widest`,
                                filter === key ? tw`text-white` : tw`text-gray-400`
                            ]}>{label}</Text>
                        </Pressable>
                    ))}
                </ScrollView>

                {/* History */}
                {["today", "yesterday", "older"].map(key => (
                    groupedItems[key].length > 0 && (
                        <View key={key} style={tw`mb-8`}>
                            <Text style={tw`text-[10px] font-black uppercase tracking-widest text-gray-300 mb-4`}>{key}</Text>
                            {groupedItems[key].map(item => {
                                const dateStr = formatDate(item.createdAt || item.date);

                                if (item.itemType === 'verified') {
                                    return (
                                        <LedgerEntryCard
                                            key={item.id}
                                            type={item.type}
                                            amount={item.amount || item.totalAmount}
                                            label={item.source === "PAYMENT" ? "Balance Added" : (item.source === 'ORDER' ? `${item.mealType || 'Meal'} Order` : "Transaction")}
                                            date={dateStr}
                                        />
                                    );
                                }

                                const isRejected = item.itemType === 'rejected';
                                return (
                                    <View key={item.id} style={[
                                        tw`rounded-2xl p-4 mb-3 border`,
                                        isRejected ? tw`border-red-100 bg-red-50/30` : tw`border-yellow-100 bg-yellow-50/30`
                                    ]}>
                                        <View style={tw`flex-row justify-between items-center`}>
                                            <View>
                                                <Text style={[
                                                    tw`text-sm font-black`,
                                                    isRejected ? tw`text-red-700` : tw`text-gray-900`
                                                ]}>
                                                    Payment — ₹{item.amount}
                                                </Text>
                                                <Text style={tw`text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5`}>{dateStr}</Text>
                                            </View>
                                            <View style={[
                                                tw`px-2 py-0.5 rounded-lg`,
                                                isRejected ? tw`bg-red-100` : tw`bg-yellow-100`
                                            ]}>
                                                <Text style={[
                                                    tw`text-[8px] font-black uppercase tracking-widest`,
                                                    isRejected ? tw`text-red-700` : tw`text-yellow-800`
                                                ]}>
                                                    {isRejected ? "Rejected" : "Pending"}
                                                </Text>
                                            </View>
                                        </View>
                                        {isRejected && <Text style={tw`text-[9px] text-red-500 mt-2 font-bold`}>Verification failed. Contact Admin.</Text>}
                                    </View>
                                );
                            })}
                        </View>
                    )
                ))}

                {filteredItems.length === 0 && (
                    <View style={tw`items-center justify-center py-20`}>
                        <ArrowDownLeft size={32} color="#e5e7eb" style={tw`mb-2`} />
                        <Text style={tw`text-[10px] font-black text-gray-300 uppercase tracking-widest text-center`}>No entries in this view</Text>
                    </View>
                )}

            </ScrollView>
        </View>
    );
};
