import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, Alert, Modal, RefreshControl } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

export const AdminPaymentsScreen = () => {
    const { tenant } = useTenant();
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
            // Client side filter or better queries if needed. For now show all.
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
        // action: 'accepted' | 'rejected'
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
        <View className="bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm">
            <View className="flex-row justify-between">
                <View>
                    <Text className="font-bold text-gray-800 text-lg">{item.userDisplayName}</Text>
                    <Text className="text-xs text-gray-400">
                        {new Date(item.createdAt?.toMillis ? item.createdAt.toMillis() : Date.now()).toDateString()}
                    </Text>
                    <View className="flex-row items-center mt-1">
                        <Text className={`font-bold text-sm uppercase px-2 py-0.5 rounded ${item.method === 'UPI' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                            {item.method}
                        </Text>
                        <Text className={`ml-2 font-bold text-sm uppercase px-2 py-0.5 rounded ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                (item.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')
                            }`}>
                            {item.status}
                        </Text>
                    </View>
                </View>
                <Text className="text-xl font-bold text-green-600">₹{item.amount}</Text>
            </View>

            {item.method === 'UPI' && item.screenshotUrl && (
                <TouchableOpacity onPress={() => setSelectedImage(item.screenshotUrl)} className="mt-3">
                    <Image source={{ uri: item.screenshotUrl }} className="w-full h-32 rounded-lg bg-gray-100" resizeMode="cover" />
                    <Text className="text-center text-xs text-gray-400 mt-1">Tap to view full receipt</Text>
                </TouchableOpacity>
            )}

            {item.status === 'pending' && (
                <View className="flex-row mt-4 space-x-3">
                    <TouchableOpacity
                        className="flex-1 bg-green-500 py-3 rounded-lg items-center"
                        onPress={() => handleAction(item.id, 'accepted')}
                    >
                        <Text className="text-white font-bold">Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="flex-1 bg-red-100 py-3 rounded-lg items-center"
                        onPress={() => handleAction(item.id, 'rejected')}
                    >
                        <Text className="text-red-600 font-bold">Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <View className="flex-1 bg-gray-50">
            <FlatList
                data={payments}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchPayments} />}
                ListEmptyComponent={<Text className="text-center text-gray-400 mt-10">No payment requests found.</Text>}
            />

            {/* Image Modal */}
            <Modal visible={!!selectedImage} transparent={true} onRequestClose={() => setSelectedImage(null)}>
                <View className="flex-1 bg-black/90 justify-center items-center relative">
                    <TouchableOpacity
                        className="absolute top-10 right-6 z-10 p-2 bg-white/20 rounded-full"
                        onPress={() => setSelectedImage(null)}
                    >
                        <Text className="text-white font-bold text-xl">X</Text>
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            className="w-full h-4/5"
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
};
