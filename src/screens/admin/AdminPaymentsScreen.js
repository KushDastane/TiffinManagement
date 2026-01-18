import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Image, Alert, Modal, RefreshControl } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import tw from 'twrnc';

export const AdminPaymentsScreen = () => {
    const { tenant } = useTenant();
    const { primaryColor } = useTheme();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);

    const fetchPayments = async () => {
        if (!tenant?.id) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, 'kitchens', tenant.id, 'payments'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setPayments(data);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchPayments();
    }, [tenant?.id]);

    const handleAction = async (paymentId, action) => {
        try {
            await updateDoc(doc(db, 'kitchens', tenant.id, 'payments', paymentId), {
                status: action,
                processedAt: serverTimestamp()
            });
            Alert.alert("Success", `Payment ${action}`);
            fetchPayments();
        } catch (error) {
            console.error("Error updating payment:", error);
            Alert.alert("Error", "Failed to update payment status");
        }
    };

    const renderItem = ({ item }) => (
        <View style={tw`bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm`}>
            <View style={tw`flex-row justify-between`}>
                <View>
                    <Text style={tw`font-bold text-gray-800 text-lg`}>{item.userDisplayName}</Text>
                    <Text style={tw`text-xs text-gray-400`}>
                        {new Date(item.createdAt?.toMillis ? item.createdAt.toMillis() : Date.now()).toDateString()}
                    </Text>
                    <View style={tw`flex-row items-center mt-1`}>
                        <Text style={tw`font-bold text-sm uppercase px-2 py-0.5 rounded ${item.method === 'UPI' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {item.method}
                        </Text>
                        <View
                            style={[
                                tw`ml-2 px-2 py-0.5 rounded`,
                                item.status === 'pending' ? { backgroundColor: `${primaryColor}20` } : (item.status === 'accepted' ? tw`bg-green-100` : tw`bg-red-100`)
                            ]}
                        >
                            <Text
                                style={[
                                    tw`font-bold text-sm uppercase`,
                                    item.status === 'pending' ? { color: primaryColor } : (item.status === 'accepted' ? tw`text-green-700` : tw`text-red-700`)
                                ]}
                            >
                                {item.status}
                            </Text>
                        </View>
                    </View>
                </View>
                <Text style={tw`text-xl font-bold text-green-600`}>₹{item.amount}</Text>
            </View>

            {item.method === 'UPI' && item.screenshotUrl && (
                <Pressable
                    onPress={() => setSelectedImage(item.screenshotUrl)}
                    style={{ marginTop: 12 }}
                >
                    <Image source={{ uri: item.screenshotUrl }} style={tw`w-full h-32 rounded-lg bg-gray-100`} resizeMode="cover" />
                    <Text style={tw`text-center text-xs text-gray-400 mt-1`}>Tap to view full receipt</Text>
                </Pressable>
            )}

            {item.status === 'pending' && (
                <View style={[tw`flex-row mt-4`, { gap: 12 }]}>
                    <Pressable
                        onPress={() => handleAction(item.id, 'accepted')}
                        style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 8,
                            alignItems: 'center',
                            backgroundColor: primaryColor
                        }}
                    >
                        <Text style={{ color: '#111827', fontWeight: 'bold' }}>Accept</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => handleAction(item.id, 'rejected')}
                        style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 8,
                            alignItems: 'center',
                            backgroundColor: '#FEF2F2',
                            borderWidth: 1,
                            borderColor: '#FEE2E2'
                        }}
                    >
                        <Text style={{ color: '#DC2626', fontWeight: 'bold' }}>Reject</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            <FlatList
                data={payments}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPayments} />}
                ListEmptyComponent={<Text style={tw`text-center text-gray-400 mt-10`}>No payment requests found.</Text>}
            />

            <Modal visible={!!selectedImage} transparent={true} onRequestClose={() => setSelectedImage(null)}>
                <View style={tw`flex-1 bg-black/90 justify-center items-center relative`}>
                    <Pressable
                        onPress={() => setSelectedImage(null)}
                        style={{
                            position: 'absolute',
                            top: 40,
                            right: 24,
                            zIndex: 10,
                            padding: 8,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: 999
                        }}
                    >
                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 20 }}>X</Text>
                    </Pressable>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={tw`w-full h-4/5`}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
};
