import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getStudentBalance } from '../../services/paymentService'; // Reusing service
import { subscribeToMyOrders } from '../../services/orderService';
import { useTenant } from '../../contexts/TenantContext';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Calendar, User, CreditCard, History, AlertCircle } from 'lucide-react-native';

const StatCard = ({ label, value, icon: Icon, highlight }) => (
    <View style={tw`flex-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100/50`}>
        <View style={[tw`w-10 h-10 rounded-xl items-center justify-center mb-3 shadow-sm`, highlight ? tw`bg-yellow-100 shadow-yellow-100` : tw`bg-gray-50`]}>
            <Icon size={16} color={highlight ? "#ca8a04" : "#111827"} strokeWidth={2.5} />
        </View>
        <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1`}>{label}</Text>
        <Text style={[tw`text-lg font-black`, highlight ? tw`text-yellow-700` : tw`text-gray-900`]}>{value}</Text>
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
        getStudentBalance(tenant.id, studentId, student?.phoneNumber).then(setBalanceData);

        // Subscribe to Orders
        const unsubOrders = subscribeToMyOrders(tenant.id, studentId, student?.phoneNumber, setOrders);
        return unsubOrders;
    }, [tenant?.id, studentId, student?.phoneNumber]);

    if (loading) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><ActivityIndicator color="#ca8a04" /></View>;
    if (!student) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><Text>Student not found</Text></View>;

    const pendingDues = balanceData ? Math.max(0, -balanceData.balance) : 0;

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Absolute Header - Prevents Clip Gap */}
            <View style={tw`absolute top-0 left-0 right-0 z-10`}>
                <LinearGradient
                    colors={['#fff', '#faf9f6']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={tw`px-6 pt-14 pb-12 rounded-b-[45px] shadow-sm border-b border-gray-100/50 flex-row items-center gap-4`}
                >
                    <Pressable onPress={() => navigation.goBack()} style={tw`w-11 h-11 rounded-2xl bg-white items-center justify-center shadow-sm border border-gray-100`}>
                        <ChevronLeft size={20} color="#111827" />
                    </Pressable>
                    <View>
                        <Text style={tw`text-2xl font-black text-gray-900`}>Student Profile</Text>
                        <Text style={tw`text-yellow-600 text-[10px] font-black uppercase tracking-widest mt-0.5`}>Ledger & History</Text>
                    </View>
                </LinearGradient>
            </View>

            <ScrollView
                contentContainerStyle={tw`p-6 pt-48 pb-32`}
                style={tw`flex-1`}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Brief */}
                <View style={tw`bg-white rounded-[28px] p-6 shadow-sm border border-gray-100/50 mb-6`}>
                    <View style={tw`flex-row items-center gap-5`}>
                        <View style={tw`w-16 h-16 rounded-[22px] bg-yellow-100 items-center justify-center border-2 border-white shadow-sm shadow-yellow-100`}>
                            <Text style={tw`text-2xl font-black text-yellow-800`}>{(student.name || 'S')[0]}</Text>
                        </View>
                        <View style={tw`flex-1`}>
                            <Text style={tw`text-xl font-black text-gray-900 leading-tight`}>{student.name || 'Student'}</Text>
                            <View style={tw`flex-row items-center gap-1.5 mt-1`}>
                                <View style={tw`w-1.5 h-1.5 rounded-full bg-emerald-500`} />
                                <Text style={tw`text-[10px] text-gray-500 font-bold uppercase tracking-widest`}>{student.phoneNumber || 'No phone verified'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                <View style={tw`flex-row bg-white rounded-2xl p-1.5 mb-6 border border-gray-100 shadow-sm`}>
                    {['OVERVIEW', 'ORDERS', 'PAYMENTS'].map(t => (
                        <Pressable
                            key={t}
                            onPress={() => setActiveTab(t)}
                            style={[tw`flex-1 py-3 rounded-xl items-center`, activeTab === t ? tw`bg-yellow-400 shadow-sm` : tw`bg-transparent`]}
                        >
                            <Text style={[tw`text-[9px] font-black tracking-widest uppercase`, activeTab === t ? tw`text-gray-900` : tw`text-gray-400`]}>{t}</Text>
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
                            <View key={o.id} style={tw`bg-white rounded-2xl p-5 border border-gray-100 mb-3 shadow-sm`}>
                                <View style={tw`flex-row justify-between items-center mb-3`}>
                                    <View>
                                        <Text style={tw`text-sm font-black text-gray-900`}>{o.mealType || o.slot}</Text>
                                        <Text style={tw`text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5`}>{o.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</Text>
                                    </View>
                                    <View style={tw`items-end`}>
                                        <Text style={tw`text-lg font-black text-gray-900`}>₹{o.totalAmount || 0}</Text>
                                        <View style={tw`bg-yellow-100 px-2 py-0.5 rounded-full mt-1`}>
                                            <Text style={tw`text-[8px] font-black text-yellow-800 uppercase tracking-widest`}>{o.status}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                        {orders.length === 0 && <Text style={tw`text-center text-gray-400 font-bold mt-10 p-8 bg-white rounded-2xl border border-dashed border-gray-200 uppercase text-[9px] tracking-widest`}>No orders recorded</Text>}
                    </View>
                )}

                {activeTab === 'PAYMENTS' && (
                    <View>
                        {balanceData?.payments?.map(p => (
                            <View key={p.id} style={tw`bg-white rounded-2xl p-5 border border-gray-100 mb-3 shadow-sm`}>
                                <View style={tw`flex-row justify-between items-center`}>
                                    <View>
                                        <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1`}>{p.createdAt?.toDate?.().toLocaleDateString() || 'N/A'}</Text>
                                        <Text style={tw`text-xl font-black text-emerald-700`}>₹{p.amount}</Text>
                                        <Text style={tw`text-[9px] font-black text-gray-900 uppercase tracking-widest mt-1`}>via {p.method || 'Payment'}</Text>
                                    </View>
                                    <View style={tw`bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100`}>
                                        <Text style={tw`text-[8px] font-black text-emerald-800 uppercase tracking-widest`}>{p.status}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                        {(!balanceData?.payments || balanceData.payments.length === 0) && <Text style={tw`text-center text-gray-400 font-bold mt-10 p-8 bg-white rounded-2xl border border-dashed border-gray-200 uppercase text-[9px] tracking-widest`}>No payments recorded</Text>}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};
