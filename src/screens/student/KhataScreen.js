import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { getStudentBalance } from "../../services/paymentService";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import tw from 'twrnc';
import { useTheme } from "../../contexts/ThemeContext";
import { useNavigation } from "@react-navigation/native";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Plus,
    Filter,
} from 'lucide-react-native';

const LedgerEntryCard = ({ type, amount, label, date }) => {
    // type: "CREDIT" (Payment) | "DEBIT" (Order)
    // Actually from service: isDebit boolean used in getStudentBalance, but here we might mix types.
    // Web App: entry.source === "PAYMENT" ? "BALANCE ADDED" : "ORDER"

    // Logic from web: 
    // if itemType == 'verified':
    //    label = source === "PAYMENT" ? "BALANCE ADDED" : "ORDER"
    //    isCredit = type === "CREDIT"

    const isCredit = type === "CREDIT";

    return (
        <View style={tw`bg-white rounded-xl p-4 shadow-sm flex-row justify-between items-center mb-3 border border-gray-100`}>
            <View>
                <Text style={tw`font-bold text-gray-900`}>{label}</Text>
                <Text style={tw`text-xs text-gray-500 mt-1`}>{date}</Text>
            </View>

            <View style={tw`flex-row items-center gap-1`}>
                {isCredit ? (
                    <ArrowDownLeft size={16} color="#16a34a" />
                ) : (
                    <ArrowUpRight size={16} color="#dc2626" />
                )}
                <Text style={[
                    tw`font-bold text-base`,
                    isCredit ? tw`text-green-600` : tw`text-red-600`
                ]}>
                    ₹{amount}
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
            // 1. Get Balance Summary & "Verified" Ledger (Orders + Accepted Payments)
            // Note: getStudentBalance in paymentService returns: { balance, orders: [], payments: [] (accepted only) }
            const summaryData = await getStudentBalance(tenant.id, user.uid);
            setSummary(summaryData);

            // Construct "Ledger" from summaryData.orders and summaryData.payments
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

        // Load initial data (Balance & Verified History)
        loadData();

        // 2. Real-time listener for Payments (Pending/Rejected/All)
        // We listen to 'payments' collection to get PENDING/REJECTED states quickly
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

    // Processing Data for Display
    const pendingPayments = payments.filter(p => p.status === "pending");
    const rejectedPayments = payments.filter(p => p.status === "rejected");

    // We already have 'ledger' which contains VERIFIED (accepted) payments and orders.
    // BUT 'payments' listener ALSO contains accepted payments. We should avoid duplicates if we merge.

    // Strategy: 
    // - Use 'ledger' from getStudentBalance for CONFIRMED/VERIFIED items (Orders + Accepted Payments)
    // - Use 'payments' snapshot ONLY for PENDING and REJECTED items.

    const allItems = [
        ...pendingPayments.map(p => ({ ...p, itemType: "pending", type: "CREDIT" })),
        ...rejectedPayments.map(p => ({ ...p, itemType: "rejected", type: "CREDIT" })),
        ...ledger // Already has itemType: "verified"
    ];

    const filteredItems = filter === "all" ? allItems : allItems.filter(i => i.itemType === filter);

    // Grouping
    const groupedItems = { today: [], yesterday: [], older: [] };

    // Sorting: Rejected > Pending > Verified, then Date Desc
    const typeOrder = { rejected: 0, pending: 1, verified: 2 };

    filteredItems.sort((a, b) => {
        if (typeOrder[a.itemType] !== typeOrder[b.itemType]) {
            return typeOrder[a.itemType] - typeOrder[b.itemType];
        }
        return normalizeDate(b.createdAt || b.date) - normalizeDate(a.createdAt || a.date);
    });

    filteredItems.forEach(item => {
        const date = item.createdAt || item.date; // Orders have 'createdAt' usually
        if (isToday(date)) groupedItems.today.push(item);
        else if (isYesterday(date)) groupedItems.yesterday.push(item);
        else groupedItems.older.push(item);
    });

    if (loading && !summary) return <View style={tw`flex-1 items-center justify-center bg-gray-50`}><ActivityIndicator color={primaryColor} /></View>;

    return (
        <View style={tw`flex-1 bg-[#fffaf2]`}>
            <View style={tw`px-6 pt-14 pb-4 bg-white`}>
                <Text style={tw`text-2xl font-bold text-gray-900`}>My Khata</Text>
            </View>

            <ScrollView
                contentContainerStyle={tw`p-6 pb-32`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {/* Summary Card */}
                <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-8`}>
                    <Text style={tw`text-xs uppercase tracking-wide text-gray-500 font-bold mb-1`}>Current Balance</Text>
                    <Text style={[
                        tw`text-4xl font-black mb-2`,
                        (summary?.balance || 0) > 0 ? tw`text-red-500` : tw`text-green-500`
                    ]}>
                        ₹{summary?.balance || 0}
                    </Text>
                    <View style={tw`flex-row justify-between mb-6`}>
                        <Text style={tw`text-xs text-gray-400 font-bold`}>Credit: ₹{summary?.totalPaid || 0}</Text>
                        <Text style={tw`text-xs text-gray-400 font-bold`}>Debit: ₹{summary?.totalOrders || 0}</Text>
                    </View>

                    <Pressable
                        onPress={() => navigation.navigate("AddPayment")}
                        style={tw`w-full bg-yellow-400 rounded-xl py-3 flex-row items-center justify-center gap-2 shadow-sm`}
                    >
                        <Plus size={20} color="black" strokeWidth={2.5} />
                        <Text style={tw`text-black font-bold text-base`}>Add Money</Text>
                    </Pressable>
                </View>

                {/* Filters */}
                <View style={tw`flex-row gap-2 mb-6`}>
                    {[
                        { key: "all", label: "All" },
                        { key: "rejected", label: "Rejected" },
                        { key: "pending", label: "Pending" },
                        { key: "verified", label: "Verified" },
                    ].map(({ key, label }) => (
                        <Pressable
                            key={key}
                            onPress={() => setFilter(key)}
                            style={[
                                tw`px-4 py-2 rounded-full border`,
                                filter === key
                                    ? tw`bg-yellow-400 border-yellow-400`
                                    : tw`bg-white border-gray-200`
                            ]}
                        >
                            <Text style={[
                                tw`text-xs font-bold`,
                                filter === key ? tw`text-gray-900` : tw`text-gray-500`
                            ]}>{label}</Text>
                        </Pressable>
                    ))}
                </View>

                {/* History */}
                <Text style={tw`text-xs font-black uppercase tracking-widest text-gray-400 mb-4`}>Transaction History</Text>

                {["today", "yesterday", "older"].map(key => (
                    groupedItems[key].length > 0 && (
                        <View key={key} style={tw`mb-6`}>
                            <Text style={tw`text-xs font-bold text-gray-400 mb-3 capitalize`}>{key}</Text>
                            {groupedItems[key].map(item => {
                                const dateStr = formatDate(item.createdAt || item.date);

                                if (item.itemType === 'verified') {
                                    return (
                                        <LedgerEntryCard
                                            key={item.id}
                                            type={item.type} // CREDIT or DEBIT
                                            amount={item.amount || item.totalAmount} // Payment or Order
                                            label={item.source === "PAYMENT" ? "BALANCE ADDED" : (item.itemType === 'ROTI_SABZI' ? `${item.mealType} Meal` : "Order")}
                                            date={dateStr}
                                        />
                                    );
                                }

                                // Pending or Rejected
                                const isRejected = item.itemType === 'rejected';
                                return (
                                    <View key={item.id} style={[
                                        tw`rounded-2xl p-4 mb-3 border bg-white`,
                                        isRejected ? tw`border-red-200 bg-red-50` : tw`border-yellow-200 bg-yellow-50`
                                    ]}>
                                        <View style={tw`flex-row justify-between items-start`}>
                                            <Text style={[
                                                tw`font-bold`,
                                                isRejected ? tw`text-red-700` : tw`text-gray-900`
                                            ]}>
                                                Balance Addition — ₹{item.amount}
                                            </Text>
                                            <View style={[
                                                tw`px-2 py-0.5 rounded-full`,
                                                isRejected ? tw`bg-red-100` : tw`bg-yellow-100`
                                            ]}>
                                                <Text style={[
                                                    tw`text-[10px] font-bold uppercase`,
                                                    isRejected ? tw`text-red-700` : tw`text-yellow-800`
                                                ]}>
                                                    {isRejected ? "Rejected" : "Pending"}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={tw`text-xs text-gray-500 mt-1`}>{dateStr}</Text>
                                        {isRejected && <Text style={tw`text-xs text-red-600 mt-2 font-bold`}>Contact admin if this seems incorrect</Text>}
                                    </View>
                                );
                            })}
                        </View>
                    )
                ))}

                {filteredItems.length === 0 && (
                    <View style={tw`items-center justify-center py-10`}>
                        <Text style={tw`text-gray-400 font-bold`}>No transactions found</Text>
                    </View>
                )}

            </ScrollView>
        </View>
    );
};
