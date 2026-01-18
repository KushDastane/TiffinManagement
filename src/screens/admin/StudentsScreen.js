import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { getKitchenStudents, getStudentBalance } from '../../services/paymentService';
import { useFocusEffect } from '@react-navigation/native';
import tw from 'twrnc';

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
        <Pressable
            onPress={() => navigation.navigate('StudentDetails', { student: item })}
            style={{
                backgroundColor: '#FFFFFF',
                padding: 16,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#F3F4F6',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1
            }}
        >
            <View>
                <Text style={tw`font-bold text-lg text-gray-800`}>{item.phoneNumber || item.email}</Text>
                <Text style={tw`text-gray-500 text-sm`}>Tap to view ledger</Text>
            </View>
            <View>
                <Text style={tw`font-bold text-lg ${item.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.balance > 0 ? `Due: ₹${item.balance}` : `Adv: ₹${Math.abs(item.balance)}`}
                </Text>
            </View>
        </Pressable>
    );

    return (
        <View style={tw`flex-1 bg-gray-50 p-4`}>
            {loading ? (
                <View style={tw`flex-1 items-center justify-center`}>
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
                        <View style={tw`items-center justify-center py-20`}>
                            <Text style={tw`text-gray-400 text-lg`}>No students joined yet.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};
