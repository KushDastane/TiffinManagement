import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getStudentBalance } from '../../services/paymentService'; // Reusing service
import { subscribeToMyOrders } from '../../services/orderService';
import { useTenant } from '../../contexts/TenantContext';
import tw from 'twrnc';
import { ChevronLeft, Calendar, User, CreditCard, History, AlertCircle } from 'lucide-react-native';

const StatCard = ({ label, value, icon: Icon, highlight }) => (
    <View style={tw`flex-1 bg-white rounded-3xl p-5 shadow-sm border border-gray-100`}>
        <View style={tw`w-8 h-8 rounded-xl bg-gray-50 items-center justify-center mb-3`}>
            <Icon size={16} color={highlight ? "#ca8a04" : "#9ca3af"} />
        </View>
        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>{label}</Text>
        <Text style={[tw`text-lg font-black mt-1`, highlight ? tw`text-yellow-700` : tw`text-gray-900`]}>{value}</Text>
    </View>
);

export const StudentDetailsScreen = ({ route, navigation }) => {
    const { studentId } = route.params;
    const { tenant } = useTenant();

    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('OVERVIEW'); // OVERVIEW | ORDERS | PAYMENTS

    const [balanceData, setBalanceData] = useState(null);
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const fetchStudent = async () => {
            const snap = await getDoc(doc(db, 'users', studentId));
            if (snap.exists()) setStudent({ id: snap.id, ...snap.data() });
            setLoading(false);
        };
        fetchStudent();
    }, [studentId]);

    useEffect(() => {
        if (!tenant?.id) return;

        // Fetch Balance
        getStudentBalance(tenant.id, studentId).then(setBalanceData);

        // Subscribe to Orders
        const unsubOrders = subscribeToMyOrders(tenant.id, studentId, setOrders);
        return unsubOrders;
    }, [tenant?.id, studentId]);

    if (loading) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><ActivityIndicator color="#ca8a04" /></View>;
    if (!student) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><Text>Student not found</Text></View>;

    const pendingDues = balanceData ? Math.max(0, -balanceData.balance) : 0;

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Header */}
            <View style={tw`px-6 pt-14 pb-6 bg-white border-b border-gray-100 flex-row items-center gap-4`}>
                <Pressable onPress={() => navigation.goBack()} style={tw`w-10 h-10 rounded-2xl bg-gray-50 items-center justify-center border border-gray-100`}>
                    <ChevronLeft size={24} color="#111827" />
                </Pressable>
                <View>
                    <Text style={tw`text-xl font-black text-gray-900`}>Student Profile</Text>
                    <Text style={tw`text-xs text-gray-400 font-bold uppercase`}>Ledger & History</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={tw`p-6 pb-32`}>
                {/* Profile Brief */}
                <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6 flex-row items-center gap-4`}>
                    <View style={tw`w-16 h-16 rounded-2xl bg-yellow-100 items-center justify-center`}>
                        <Text style={tw`text-2xl font-black text-yellow-800`}>{(student.name || 'S')[0]}</Text>
                    </View>
                    <View>
                        <Text style={tw`text-xl font-black text-gray-900`}>{student.name || 'Student'}</Text>
                        <Text style={tw`text-sm text-gray-500 font-bold`}>{student.phoneNumber || 'No phone'}</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={tw`flex-row bg-gray-100 p-1.5 rounded-3xl mb-6`}>
                    {['OVERVIEW', 'ORDERS', 'PAYMENTS'].map(t => (
                        <Pressable
                            key={t}
                            onPress={() => setActiveTab(t)}
                            style={[tw`flex-1 py-2.5 rounded-2xl items-center`, activeTab === t ? tw`bg-white shadow-sm` : tw`bg-transparent`]}
                        >
                            <Text style={[tw`text-[10px] font-black`, activeTab === t ? tw`text-gray-900` : tw`text-gray-400`]}>{t}</Text>
                        </Pressable>
                    ))}
                </View>

                {activeTab === 'OVERVIEW' && (
                    <View style={tw`flex-row gap-4`}>
                        <StatCard
                            label="Total Orders"
                            value={orders.length}
                            icon={History}
                        />
                        <StatCard
                            label="Current Dues"
                            value={pendingDues > 0 ? `₹${pendingDues}` : "CLEARED"}
                            icon={AlertCircle}
                            highlight={pendingDues > 0}
                        />
                    </View>
                )}

                {activeTab === 'ORDERS' && (
                    <View>
                        {orders.map(o => (
                            <View key={o.id} style={tw`bg-white rounded-3xl p-5 border border-gray-100 mb-3 shadow-sm`}>
                                <View style={tw`flex-row justify-between items-start mb-2`}>
                                    <View>
                                        <Text style={tw`text-sm font-black text-gray-900 uppercase`}>{o.mealType || o.slot}</Text>
                                        <Text style={tw`text-[10px] font-bold text-gray-400`}>{o.createdAt?.toDate?.().toLocaleString() || 'N/A'}</Text>
                                    </View>
                                    <Text style={tw`text-lg font-black text-gray-900`}>₹{o.totalAmount || 0}</Text>
                                </View>
                                <View style={tw`bg-yellow-50 self-start px-3 py-1 rounded-full`}><Text style={tw`text-[10px] font-bold text-yellow-800 uppercase`}>{o.status}</Text></View>
                            </View>
                        ))}
                        {orders.length === 0 && <Text style={tw`text-center text-gray-400 font-bold mt-10`}>No orders recorded</Text>}
                    </View>
                )}

                {activeTab === 'PAYMENTS' && (
                    <View>
                        {balanceData?.payments?.map(p => (
                            <View key={p.id} style={tw`bg-white rounded-3xl p-5 border border-gray-100 mb-3 shadow-sm`}>
                                <View style={tw`flex-row justify-between items-center mb-2`}>
                                    <View>
                                        <Text style={tw`text-lg font-black text-emerald-700`}>₹{p.amount}</Text>
                                        <Text style={tw`text-[10px] font-bold text-gray-400`}>{p.createdAt?.toDate?.().toLocaleString() || 'N/A'}</Text>
                                    </View>
                                    <View style={tw`bg-emerald-50 px-3 py-1 rounded-full`}><Text style={tw`text-[10px] font-bold text-emerald-800 uppercase`}>{p.status}</Text></View>
                                </View>
                                <Text style={tw`text-[10px] font-bold text-gray-500 uppercase tracking-widest`}>via {p.paymentMode}</Text>
                            </View>
                        ))}
                        {(!balanceData?.payments || balanceData.payments.length === 0) && <Text style={tw`text-center text-gray-400 font-bold mt-10`}>No payments recorded</Text>}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};
