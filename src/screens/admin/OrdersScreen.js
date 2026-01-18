import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscribeToOrders, updateOrder } from '../../services/orderService';
import { getMenuDateId } from '../../services/menuService';

const StatCard = ({ title, value, type }) => {
    const { primaryColor } = useTheme();
    let bgClass = "bg-white";
    let textClass = "text-gray-800";
    if (type === 'danger') { bgClass = "bg-red-50"; textClass = "text-red-600"; }
    if (type === 'warning') { bgClass = "bg-yellow-50"; textClass = "text-yellow-700"; }
    if (type === 'success') { bgClass = "bg-green-50"; textClass = "text-green-700"; }

    return (
        <View
            style={{ borderLeftColor: primaryColor }}
            className={`flex-1 p-3 rounded-xl m-1 items-center justify-center border-l-4 border-y border-r border-gray-100 shadow-sm ${bgClass}`}
        >
            <Text className={`text-2xl font-bold ${textClass}`}>{value}</Text>
            <Text className="text-gray-500 text-xs text-center">{title}</Text>
        </View>
    );
};

export const OrdersScreen = () => {
    const { tenant } = useTenant();
    const { primaryColor } = useTheme();
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

    const handleUpdateStatus = async (orderId, updates) => {
        const result = await updateOrder(tenant.id, orderId, updates);
        if (result.error) {
            Alert.alert("Error", result.error);
        }
    };

    // Stats Logic
    const pendingOrders = orders.filter(o => o.status === 'placed').length;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const renderItem = ({ item }) => {
        const isRotiSabzi = item.type === 'ROTI_SABZI';

        return (
            <View className="bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm">
                <View className="flex-row justify-between items-start mb-2">
                    <View>
                        <View className="flex-row items-center">
                            <Text className="font-bold text-lg text-gray-800">{item.userDisplayName}</Text>
                            {item.isTrial && (
                                <View
                                    style={{ backgroundColor: `${primaryColor}20` }}
                                    className="ml-2 px-2 py-0.5 rounded"
                                >
                                    <Text
                                        style={{ color: primaryColor }}
                                        className="text-[10px] font-bold uppercase"
                                    >
                                        Trial
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text className="text-xs text-gray-400 capitalize">{item.slot} • {new Date(item.createdAt?.toMillis ? item.createdAt.toMillis() : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View className="items-end">
                        <View className={`px-3 py-1 rounded-full ${item.status === 'placed' ? 'bg-orange-50' : 'bg-green-50'}`}>
                            <Text className={`font-bold text-xs ${item.status === 'placed' ? 'text-orange-600' : 'text-green-600'}`}>
                                {item.status.toUpperCase()}
                            </Text>
                        </View>
                        {item.isTrial && (
                            <Text className={`text-[10px] mt-1 font-bold ${item.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                                {item.paymentMethod?.toUpperCase()} • {item.paymentStatus?.toUpperCase()}
                            </Text>
                        )}
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

                {/* Actions */}
                <View className="mt-3 flex-row space-x-2">
                    {item.status === 'placed' && (
                        <TouchableOpacity
                            style={{ backgroundColor: primaryColor }}
                            className="flex-1 p-3 rounded-lg items-center"
                            onPress={() => handleUpdateStatus(item.id, { status: 'confirmed' })}
                        >
                            <Text className="font-bold text-gray-900 text-sm">Confirm Order</Text>
                        </TouchableOpacity>
                    )}
                    {item.isTrial && item.paymentStatus !== 'paid' && (
                        <TouchableOpacity
                            style={{ backgroundColor: primaryColor }}
                            className="flex-1 p-3 rounded-lg items-center"
                            onPress={() => handleUpdateStatus(item.id, { paymentStatus: 'paid' })}
                        >
                            <Text className="font-bold text-gray-900 text-sm">Mark Paid</Text>
                        </TouchableOpacity>
                    )}
                </View>
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
                <View className="w-1/2"><StatCard title="Total" value={totalOrders} type="success" /></View>
                <View className="w-1/2"><StatCard title="Revenue" value={`₹${totalRevenue}`} type="neutral" /></View>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
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
