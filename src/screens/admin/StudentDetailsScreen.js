import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { getStudentBalance, recordPayment } from '../../services/paymentService';
import tw from 'twrnc';

export const StudentDetailsScreen = ({ route, navigation }) => {
    const { student } = route.params;
    const { tenant } = useTenant();
    const [ledger, setLedger] = useState({ orders: [], payments: [], balance: 0 });
    const [transactions, setTransactions] = useState([]);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchLedger = async () => {
        if (!tenant?.id) return;
        setRefreshing(true);
        const data = await getStudentBalance(tenant.id, student.id);

        setLedger(data);

        // Merge and sort transactions
        const allTxns = [
            ...(data.orders || []).map(o => ({ ...o, date: o.createdAt?.toMillis ? o.createdAt.toMillis() : Date.now(), isOrder: true })),
            ...(data.payments || []).map(p => ({ ...p, date: p.createdAt?.toMillis ? p.createdAt.toMillis() : Date.now(), isOrder: false }))
        ].sort((a, b) => b.date - a.date);

        setTransactions(allTxns);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchLedger();
    }, []);

    const handlePayment = async () => {
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            Alert.alert("Error", "Enter a valid amount");
            return;
        }

        Alert.alert(
            "Confirm Payment",
            `Record payment of ₹${amount} from ${student.phoneNumber}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Record Payment",
                    onPress: async () => {
                        setLoading(true);
                        const result = await recordPayment(tenant.id, student.id, amount, "Manual Entry");
                        setLoading(false);

                        if (result.error) {
                            Alert.alert("Error", "Failed to record payment");
                        } else {
                            setAmount('');
                            fetchLedger(); // Refresh
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={tw`bg-white p-3 border-b border-gray-100 flex-row justify-between items-center`}>
            <View>
                <Text style={tw`font-bold text-gray-800`}>
                    {item.isOrder ? (item.mealType === 'lunch' ? 'Lunch Order' : 'Dinner Order') : 'Payment Received'}
                </Text>
                <Text style={tw`text-gray-500 text-xs`}>
                    {new Date(item.date).toDateString()}
                </Text>
            </View>
            <Text style={tw`font-bold ${item.isOrder ? 'text-red-500' : 'text-green-600'}`}>
                {item.isOrder ? '-' : '+'} ₹{item.isOrder ? item.price : item.amount}
            </Text>
        </View>
    );

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            {/* Header / Summary */}
            <View style={tw`bg-white p-6 shadow-sm mb-2`}>
                <Text style={tw`text-2xl font-bold text-gray-800 mb-1`}>{student.phoneNumber}</Text>
                <View style={tw`flex-row items-center mt-2`}>
                    <Text style={tw`text-gray-500 text-lg mr-2`}>Current Dues:</Text>
                    <Text style={tw`text-3xl font-bold ${ledger.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{ledger.balance}
                    </Text>
                </View>
            </View>

            {/* Payment Entry Inputs */}
            <View style={tw`bg-white p-4 mb-2 shadow-sm flex-row items-center gap-2`}>
                <TextInput
                    style={tw`flex-1 bg-gray-100 border border-gray-200 rounded-lg p-3 text-lg`}
                    placeholder="Enter Amount"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                />
                <Pressable
                    style={[tw`bg-green-500 rounded-lg p-3 px-6 justify-center`, loading && tw`opacity-50`]}
                    onPress={handlePayment}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="white" /> : <Text style={tw`font-bold text-white text-lg`}>Receive</Text>}
                </Pressable>
            </View>

            {/* Transactions List */}
            <FlatList
                data={transactions}
                renderItem={renderItem}
                keyExtractor={(item, index) => item.id || index.toString()}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshing={refreshing}
                onRefresh={fetchLedger}
            />
        </View>
    );
};
