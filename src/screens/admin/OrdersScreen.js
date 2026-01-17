import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { subscribeToOrders } from '../../services/orderService';
import { getMenuDateId } from '../../services/menuService';

const StatCard = ({ title, value, type }) => {
    let bgClass = "bg-white";
    let textClass = "text-gray-800";
    if (type === 'danger') { bgClass = "bg-red-50"; textClass = "text-red-600"; }
    if (type === 'warning') { bgClass = "bg-yellow-50"; textClass = "text-yellow-700"; }
    if (type === 'success') { bgClass = "bg-green-50"; textClass = "text-green-700"; }

    return (
        <View className={`flex-1 p-3 rounded-xl m-1 items-center justify-center border border-gray-100 shadow-sm ${bgClass}`}>
            <Text className={`text-2xl font-bold ${textClass}`}>{value}</Text>
            <Text className="text-gray-500 text-xs text-center">{title}</Text>
        </View>
    );
};

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

    // Stats Logic
    const pendingOrders = orders.filter(o => o.status === 'placed').length;
    const totalOrders = orders.length;
    // const uniqueStudents = new Set(orders.map(o => o.userId)).size; 
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const renderItem = ({ item }) => {
        const isRotiSabzi = item.type === 'ROTI_SABZI';

        return (
            <View className="bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm">
                <View className="flex-row justify-between items-start mb-2">
                    <View>
                        <Text className="font-bold text-lg text-gray-800">{item.userDisplayName}</Text>
                        <Text className="text-xs text-gray-400 capitalize">{item.slot} • {new Date(item.createdAt?.toMillis ? item.createdAt.toMillis() : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${item.status === 'placed' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        <Text className={`font-bold text-xs ${item.status === 'placed' ? 'text-yellow-800' : 'text-green-800'}`}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                {/* Detailed Items */}
                <View className="bg-gray-50 p-3 rounded-lg">
                    <Text className="font-semibold text-gray-800 text-base">
                        {isRotiSabzi
                            ? `${item.mainItem} (${item.variant})`
                            : item.mainItem
                        }
                    </Text>

                    {/* Addons for Roti Sabzi */}
                    {isRotiSabzi && item.variant === 'full' && item.addons && item.addons.length > 0 && (
                        <Text className="text-gray-500 text-sm">
                            + {item.addons.join(', ')}
                        </Text>
                    )}

                    {/* Extras */}
                    {item.extras && item.extras.length > 0 && (
                        <View className="mt-2 pt-2 border-t border-gray-200">
                            {item.extras.map((ex, i) => (
                                <Text key={i} className="text-gray-600 text-sm">
                                    + {ex.quantity} x {ex.name}
                                </Text>
                            ))}
                        </View>
                    )}
                </View>

                {/* Total */}
                <View className="mt-3 flex-row justify-end">
                    <Text className="font-bold text-gray-800 text-lg">Total: ₹{item.totalAmount}</Text>
                </View>

                {/* Actions (Confirm) */}
                {item.status === 'placed' && (
                    <View className="mt-3">
                        {/* TODO: Add logic to update status to 'confirmed' */}
                        <TouchableOpacity className="bg-yellow-400 p-3 rounded-lg items-center">
                            <Text className="font-bold text-black">Confirm Order</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    return (
        <View className="flex-1 bg-gray-50">
            {/* Header */}
            <View className="bg-white p-4 pb-2 shadow-sm z-10">
                <Text className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Kitchen Operations</Text>
                <View className="flex-row items-center justify-between">
                    <TouchableOpacity onPress={() => changeDate(-1)}>
                        <Text className="text-2xl font-bold text-gray-400">{'<'}</Text>
                    </TouchableOpacity>
                    <Text className="text-xl font-bold text-gray-800">{selectedDate.toDateString()}</Text>
                    <TouchableOpacity onPress={() => changeDate(1)}>
                        <Text className="text-2xl font-bold text-gray-400">{'>'}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats Grid */}
            <View className="p-2 flex-row flex-wrap">
                <View className="w-1/2"><StatCard title="Pending" value={pendingOrders} type={pendingOrders > 0 ? 'danger' : 'neutral'} /></View>
                <View className="w-1/2"><StatCard title="Total Orders" value={totalOrders} type="success" /></View>
                <View className="w-1/2"><StatCard title="Revenue" value={`₹${totalRevenue}`} type="neutral" /></View>
                {/* <View className="w-1/2"><StatCard title="Active Users" value={uniqueStudents} type="neutral" /></View> */}
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
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-10">
                            <Text className="text-gray-400 text-lg">No orders for today</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};
