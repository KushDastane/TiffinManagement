import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Image, Alert, Modal, RefreshControl, ScrollView } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getKitchenOutstandingSummary } from '../../services/paymentService';
import tw from 'twrnc';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X, Eye, IndianRupee, Calendar, User, CreditCard, ArrowRight, AlertCircle } from 'lucide-react-native';

export const AdminPaymentsScreen = () => {
    const { tenant } = useTenant();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [processingId, setProcessingId] = useState(null);


    useEffect(() => {
        if (!tenant?.id) return;
        setLoading(true);
        const q = query(
            collection(db, 'kitchens', tenant.id, 'payments'),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPayments(data);
            setLoading(false);
            setRefreshing(false);
        }, (err) => {
            console.error(err);
            setLoading(false);
            setRefreshing(false);
        });

        return unsub;
    }, [tenant?.id]);

    const handleAction = async (paymentId, action) => {
        setProcessingId(paymentId);
        try {
            await updateDoc(doc(db, 'kitchens', tenant.id, 'payments', paymentId), {
                status: action,
                processedAt: serverTimestamp()
            });
            Alert.alert("Success", `Payment ${action}`);
        } catch (error) {
            console.error("Error updating payment:", error);
            Alert.alert("Error", "Failed to update payment status");
        }
        setProcessingId(null);
    };

    const onRefresh = () => {
        setRefreshing(true);
        // Snapshot updates auto - just show spinner briefly
        setTimeout(() => setRefreshing(false), 800);
    };

    const renderItem = ({ item }) => {
        const isPending = item.status === 'pending';
        const isAccepted = item.status === 'accepted';

        return (
            <View style={tw`bg-white rounded-[30px] p-6 mb-4 shadow-sm border border-gray-100/50`}>
                <View style={tw`flex-row justify-between items-start mb-4`}>
                    <View style={tw`flex-row items-center gap-3`}>
                        <View style={tw`w-12 h-12 rounded-2xl bg-gray-50 items-center justify-center border border-gray-100`}>
                            <User size={20} color="#4b5563" />
                        </View>
                        <View>
                            <Text style={tw`text-base font-black text-gray-900`}>{item.userDisplayName || 'Student'}</Text>
                            <View style={tw`flex-row items-center gap-1 mt-0.5`}>
                                <Calendar size={10} color="#9ca3af" />
                                <Text style={tw`text-[10px] font-bold text-gray-400`}>
                                    {new Date(item.createdAt?.toMillis ? item.createdAt.toMillis() : Date.now()).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </View>
                    <View style={tw`items-end`}>
                        <Text style={tw`text-xl font-black text-emerald-600`}>₹{item.amount}</Text>
                        <View style={[tw`px-2 py-0.5 rounded-full mt-1`, isPending ? tw`bg-yellow-100` : (isAccepted ? tw`bg-emerald-100` : tw`bg-red-100`)]}>
                            <Text style={[tw`text-[10px] font-black uppercase`, isPending ? tw`text-yellow-800` : (isAccepted ? tw`text-emerald-800` : tw`text-red-800`)]}>{item.status}</Text>
                        </View>
                    </View>
                </View>

                <View style={tw`flex-row gap-2 mb-4`}>
                    <View style={tw`bg-gray-50 px-3 py-1 rounded-lg border border-gray-100`}><Text style={tw`text-[10px] font-bold text-gray-500 uppercase`}>{item.method}</Text></View>
                    {item.utr && <View style={tw`bg-gray-50 px-3 py-1 rounded-lg border border-gray-100`}><Text style={tw`text-[10px] font-bold text-gray-500 uppercase`}>UTR: {item.utr}</Text></View>}
                </View>

                {item.method === 'UPI' && item.screenshotUrl && (
                    <Pressable
                        onPress={() => setSelectedImage(item.screenshotUrl)}
                        style={tw`w-full h-40 rounded-3xl bg-gray-50 border border-gray-100 overflow-hidden mb-4 relative`}
                    >
                        <Image source={{ uri: item.screenshotUrl }} style={tw`w-full h-full`} resizeMode="cover" />
                        <View style={tw`absolute inset-0 bg-black/5 items-center justify-center`}>
                            <View style={tw`bg-white/90 px-3 py-1.5 rounded-xl flex-row items-center gap-2 shadow-sm`}>
                                <Eye size={14} color="#111827" />
                                <Text style={tw`text-[10px] font-black text-gray-900`}>VIEW RECEIPT</Text>
                            </View>
                        </View>
                    </Pressable>
                )}

                {isPending && (
                    <View style={tw`flex-row gap-3 mt-2`}>
                        <Pressable
                            disabled={processingId === item.id}
                            onPress={() => handleAction(item.id, 'accepted')}
                            style={tw`flex-1 bg-yellow-400 rounded-2xl py-4 items-center justify-center flex-row gap-2`}
                        >
                            {processingId === item.id ? <ActivityIndicator size="small" color="#111827" /> : (
                                <>
                                    <Check size={18} color="#111827" />
                                    <Text style={tw`text-gray-900 font-black text-sm uppercase`}>Accept</Text>
                                </>
                            )}
                        </Pressable>
                        <Pressable
                            disabled={processingId === item.id}
                            onPress={() => handleAction(item.id, 'rejected')}
                            style={tw`bg-red-50 rounded-2xl py-4 px-6 items-center justify-center border border-red-100`}
                        >
                            <X size={18} color="#b91c1c" />
                        </Pressable>
                    </View>
                )}
            </View>
        );
    };

    if (loading && !refreshing) return <View style={tw`flex-1 items-center justify-center bg-[#faf9f6]`}><ActivityIndicator color="#ca8a04" /></View>;

    return (
        <View style={tw`flex-1 bg-[#faf9f6]`}>
            {/* Absolute Header - Prevents Clip Gap */}
            <View style={tw`absolute pb-3 top-0 left-0 right-0 z-10`}>
                <LinearGradient
                    colors={['#fff', '#faf9f6']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={tw`px-6 pt-16 pb-6 rounded-b-[45px] shadow-sm border-b border-gray-100/50`}
                >
                    <View style={tw`flex-row justify-between items-end mb-2`}>
                        <View>
                            <Text style={tw`text-2xl font-black text-gray-900`}>Financial Ledger</Text>
                            <Text style={tw`text-yellow-600 text-[9px] font-black uppercase tracking-widest mt-0.5`}>Review & Manage Payments</Text>
                        </View>
                    </View>

                </LinearGradient>
            </View>

            <FlatList
                data={payments}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                style={tw`flex-1`}
                contentContainerStyle={tw`p-6 pb-32 pt-40`}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={tw`items-center justify-center py-20`}>
                        <IndianRupee size={48} color="#e5e7eb" />
                        <Text style={tw`text-gray-400 font-black mt-4`}>No payments found</Text>
                    </View>
                }
            />

            <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
                <View style={tw`flex-1 bg-black/95 justify-center items-center`}>
                    <Pressable
                        onPress={() => setSelectedImage(null)}
                        style={tw`absolute top-14 right-6 w-12 h-12 bg-white/20 rounded-2xl items-center justify-center z-10`}
                    >
                        <X size={24} color="white" />
                    </Pressable>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={{ width: '90%', height: '80%' }}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
};

