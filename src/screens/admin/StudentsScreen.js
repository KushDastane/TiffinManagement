import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { getKitchenStudents, getStudentBalance } from '../../services/paymentService';
import { useFocusEffect } from '@react-navigation/native';

export const StudentsScreen = ({ navigation }) => {
    const { tenant } = useTenant();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchStudents = async () => {
        if (!tenant?.id) return;
        setLoading(true);

        try {
            const users = await getKitchenStudents(tenant.id);

            // Calc balance for each (Parallel/Promise.all)
            const studentsWithBalance = await Promise.all(users.map(async (u) => {
                const ledger = await getStudentBalance(tenant.id, u.id);
                return { ...u, balance: ledger.balance || 0 };
            }));

            setStudents(studentsWithBalance);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchStudents();
        }, [tenant?.id])
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity
            className="bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm flex-row justify-between items-center"
            onPress={() => navigation.navigate('StudentDetails', { student: item })}
        >
            <View>
                <Text className="font-bold text-lg text-gray-800">{item.phoneNumber || item.email}</Text>
                <Text className="text-gray-500 text-sm">Tap to view ledger</Text>
            </View>
            <View>
                <Text className={`font-bold text-lg ${item.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.balance > 0 ? `Due: ₹${item.balance}` : `Adv: ₹${Math.abs(item.balance)}`}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View className="flex-1 bg-gray-50 p-4">
            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#EAB308" />
                </View>
            ) : (
                <FlatList
                    data={students}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={fetchStudents} />
                    }
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Text className="text-gray-400 text-lg">No students joined yet.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};
