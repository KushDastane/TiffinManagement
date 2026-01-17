import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { subscribeToOrders } from '../../services/orderService';
import { getMenuDateId } from '../../services/menuService';

export const OrdersScreen = () => {
    const { tenant } = useTenant();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const dateId = getMenuDateId(selectedDate);

    useEffect(() => {
        if (!tenant?.id) return;

        setLoading(true);
        const unsubscribe = subscribeToOrders(tenant.id, dateId, (data) => {
            setOrders(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenant?.id, dateId]);

    const renderItem = ({ item }) => (
        <View className="bg-white p-4 rounded-lg mb-3 border border-gray-100 shadow-sm flex-row justify-between items-center">
            <View className="flex-1">
                <Text className="font-bold text-lg text-gray-800">{item.userDisplayName}</Text>
                <Text className="text-gray-600 font-medium capitalize">{item.mealType} - ₹{item.price}</Text>
                {item.description && (
                    <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>{item.description}</Text>
                )}
            </View>
            <View>
                <View className={`px-3 py-1 rounded-full ${item.status === 'placed' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                    <Text className={`font-bold text-xs ${item.status === 'placed' ? 'text-yellow-800' : 'text-green-800'}`}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
            </View>
        </View>
    );

    // Simple date switcher recycled from MenuScreen
    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    return (
        <View className="flex-1 bg-gray-50 p-4">
            {/* Date Switcher */}
            <View className="flex-row items-center justify-between mb-4 bg-white p-3 rounded-lg shadow-sm">
                <TouchableOpacity onPress={() => changeDate(-1)} className="p-2">
                    <Text className="text-xl font-bold text-gray-600">{'<'}</Text>
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-800">
                    Orders for {selectedDate.toDateString()}
                </Text>
                <TouchableOpacity onPress={() => changeDate(1)} className="p-2">
                    <Text className="text-xl font-bold text-gray-600">{'>'}</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color="#EAB308" />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20">
                            <Text className="text-gray-400 text-lg">No orders for this date</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};
