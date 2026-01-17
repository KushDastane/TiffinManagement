import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, Image, Pressable, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { getStudentBalance } from '../../services/paymentService';
import { useFocusEffect } from '@react-navigation/native';

export const KhataScreen = ({ navigation }) => {
    const { user } = useAuth();
    const { tenant } = useTenant();
    const [ledger, setLedger] = useState({ balance: 0 });
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLedger = async () => {
        if (!tenant?.id || !user?.uid) return;
        setLoading(true);
        const data = await getStudentBalance(tenant.id, user.uid);

        setLedger(data);

        // Merge Orders and Payments (Confirmed + Pending)
        // We want to show Pending payments in the list too, but maybe marked.
        const allTxns = [
            ...(data.orders || []).map(o => ({
                ...o,
                dateMillis: o.createdAt?.toMillis ? o.createdAt.toMillis() : Date.now(),
                label: `Order: ${o.slot ? o.slot.toUpperCase() : 'Meal'}`,
                amount: o.totalAmount,
                isDebit: true
            })),
            ...(data.payments || []).map(p => ({
                ...p,
                dateMillis: p.createdAt?.toMillis ? p.createdAt.toMillis() : Date.now(),
                label: `Payment: ${p.method}`,
                isDebit: false
            })),
            ...(data.pendingPayments || []).map(p => ({
                ...p,
                dateMillis: p.createdAt?.toMillis ? p.createdAt.toMillis() : Date.now(),
                label: `Payment (${p.status})`,
                isDebit: false
            }))
        ].sort((a, b) => b.dateMillis - a.dateMillis);

        setTransactions(allTxns);
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            fetchLedger();
        }, [tenant?.id, user?.uid])
    );

    const renderItem = ({ item }) => (
        <View className="bg-white p-4 border-b border-gray-100 flex-row justify-between items-center">
            <View className="flex-1">
                <Text className="font-bold text-gray-800 text-base">{item.label}</Text>
                <Text className="text-gray-400 text-xs">
                    {new Date(item.dateMillis).toDateString()} • {new Date(item.dateMillis).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {item.status === 'pending' && (
                    <Text className="text-yellow-600 text-xs font-bold mt-1">Pending Approval</Text>
                )}
            </View>
            <View className="items-end">
                <Text className={`font-bold text-lg ${item.isDebit ? 'text-red-500' : (item.status === 'pending' ? 'text-gray-400' : 'text-green-600')}`}>
                    {item.isDebit ? '-' : '+'} ₹{item.amount}
                </Text>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header / Balance Card */}
            <View className="bg-white p-6 pb-4 shadow-sm z-10">
                <Text className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-1">Current One-View Balance</Text>
                <Text className={`text-4xl font-extrabold ${ledger.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {ledger.balance > 0 ? '' : ''}₹{ledger.balance}
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                    {ledger.balance > 0 ? "You owe this amount" : "Advance paid"}
                </Text>

                <Pressable
                    style={{
                        marginTop: 16,
                        backgroundColor: '#facc15', // yellow-400
                        padding: 12,
                        borderRadius: 8,
                        alignItems: 'center'
                    }}
                    onPress={() => navigation.navigate('AddPayment')}
                >
                    <Text className="font-bold text-black">Pay Now / Add Entry</Text>
                </Pressable>
            </View>

            {loading && transactions.length === 0 ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#EAB308" />
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLedger} />}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListHeaderComponent={
                        <Text className="p-4 text-gray-500 font-bold text-xs uppercase tracking-widest">Transactions</Text>
                    }
                />
            )}
        </View>
    );
};
