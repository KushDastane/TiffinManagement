import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { getStudentBalance } from '../../services/paymentService';
import { useFocusEffect } from '@react-navigation/native';

export const HistoryScreen = () => {
    const { user } = useAuth();
    const { tenant } = useTenant();
    const [ledger, setLedger] = useState({ balance: 0 });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = async () => {
        if (!tenant?.id || !user?.uid) return;
        setLoading(true);

        const data = await getStudentBalance(tenant.id, user.uid);

        // Filter ONLY orders for History Screen
        const orderTxns = (data.orders || []).map(o => ({ ...o, date: o.createdAt?.toMillis ? o.createdAt.toMillis() : Date.now(), isOrder: true }));

        setTransactions(orderTxns.sort((a, b) => b.date - a.date));
        setLedger(data); // Still useful if we want to show balance somewhere, but main list is orders
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            fetchHistory();
        }, [tenant?.id, user?.uid])
    );

    const renderItem = ({ item }) => (
        <View className="bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm flex-row justify-between items-center">
            <View>
                <Text className="font-bold text-gray-800 text-base">
                    {item.isOrder ? (item.mealType === 'lunch' ? 'Lunch' : 'Dinner') : 'Payment'}
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                    {new Date(item.date).toDateString()}
                </Text>
            </View>
            <View className="items-end">
                <Text className={`font-bold text-lg ${item.isOrder ? 'text-red-500' : 'text-green-600'}`}>
                    {item.isOrder ? '-' : '+'} ₹{item.isOrder ? item.price : item.amount}
                </Text>
                {item.isOrder && (
                    <Text className="text-gray-400 text-xs lowercase">{item.status}</Text>
                )}
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50 p-4">
            {/* Balance Card */}
            <View className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100 items-center">
                <Text className="text-gray-500 text-lg mb-2">Total Dues</Text>
                <Text className={`text-4xl font-bold ${ledger.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{ledger.balance}
                </Text>
                <Text className="text-gray-400 text-xs mt-2">
                    {ledger.balance > 0 ? "Please clear your dues" : "You have advance balance"}
                </Text>
            </View>

            <Text className="text-xl font-bold mb-4 text-gray-800">Transaction History</Text>

            {loading && transactions.length === 0 ? (
                <ActivityIndicator size="large" color="#EAB308" />
            ) : (
                <FlatList
                    data={transactions}
                    renderItem={renderItem}
                    keyExtractor={(item, index) => item.id || index.toString()}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={fetchHistory} />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Text className="text-gray-400">No transactions yet.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};
