import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
import { subscribeToOrders, updateOrder } from '../../services/orderService';
import { getMenuDateId } from '../../services/menuService';
import tw from 'twrnc';

const StatCard = ({ title, value, type }) => {
    const { primaryColor } = useTheme();
    let bgClass = "bg-white";
    let textClass = "text-gray-800";
    if (type === 'danger') { bgClass = "bg-red-50"; textClass = "text-red-600"; }
    if (type === 'warning') { bgClass = "bg-yellow-50"; textClass = "text-yellow-700"; }
    if (type === 'success') { bgClass = "bg-green-50"; textClass = "text-green-700"; }

    return (
        <View
            style={[
                tw`flex-1 p-3 rounded-xl m-1 items-center justify-center border-l-4 border-y border-r border-gray-100 shadow-sm ${bgClass}`,
                { borderLeftColor: primaryColor }
            ]}
        >
            <Text style={tw`text-2xl font-bold ${textClass}`}>{value}</Text>
            <Text style={tw`text-gray-500 text-xs text-center`}>{title}</Text>
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
            <View style={tw`bg-white p-4 rounded-xl mb-3 border border-gray-100 shadow-sm`}>
                <View style={tw`flex-row justify-between items-start mb-2`}>
                    <View>
                        <View style={tw`flex-row items-center`}>
                            <Text style={tw`font-bold text-lg text-gray-800`}>{item.userDisplayName}</Text>
                            {item.isTrial && (
                                <View
                                    style={[tw`ml-2 px-2 py-0.5 rounded`, { backgroundColor: `${primaryColor}20` }]}
                                >
                                    <Text
                                        style={[tw`text-[10px] font-bold uppercase`, { color: primaryColor }]}
                                    >
                                        Trial
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Text style={tw`text-xs text-gray-400 capitalize`}>{(item.slotLabel || item.slot)} • {new Date(item.createdAt?.toMillis ? item.createdAt.toMillis() : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <View style={tw`items-end`}>
                        <View style={tw`px-3 py-1 rounded-full ${item.status === 'placed' ? 'bg-orange-50' : 'bg-green-50'}`}>
                            <Text style={tw`font-bold text-xs ${item.status === 'placed' ? 'text-orange-600' : 'text-green-600'}`}>
                                {item.status.toUpperCase()}
                            </Text>
                        </View>
                        {item.isTrial && (
                            <Text style={tw`text-[10px] mt-1 font-bold ${item.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                                {item.paymentMethod?.toUpperCase()} • {item.paymentStatus?.toUpperCase()}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Detailed Items */}
                <View style={tw`bg-gray-50 p-4 rounded-xl`}>
                    <Text style={tw`font-black text-gray-900 text-lg mb-1`}>
                        {item.mainItem}
                    </Text>

                    {/* Snapshot-based Rendering */}
                    {item.variantSnapshot ? (
                        <View style={tw`mb-2`}>
                            <Text style={tw`text-blue-700 font-bold text-xs uppercase tracking-wider`}>
                                {item.variantSnapshot.label}
                                {item.variantSnapshot.quantities?.roti ? ` • ${item.variantSnapshot.quantities.roti} Roti` : ''}
                            </Text>
                        </View>
                    ) : (
                        item.variant && (
                            <Text style={tw`text-blue-600 font-bold text-xs uppercase mb-1`}>
                                {item.variant.toUpperCase()} DABBA
                            </Text>
                        )
                    )}

                    {/* Components (Addons/Extras) */}
                    {(item.componentsSnapshot || item.extras || [])?.length > 0 && (
                        <View style={tw`mt-2 pt-2 border-t border-gray-200`}>
                            {(item.componentsSnapshot || []).map((c, i) => (
                                <View key={i} style={tw`flex-row justify-between mb-1`}>
                                    <Text style={tw`text-gray-600 text-sm`}>
                                        + {c.quantity} x {c.name}
                                    </Text>
                                    {c.isDailySpecial && <Text style={tw`text-[8px] font-bold text-orange-400 uppercase`}>Special</Text>}
                                </View>
                            ))}

                            {/* Old Extras Fallback */}
                            {!item.componentsSnapshot && item.extras?.map((ex, i) => (
                                <Text key={i} style={tw`text-gray-600 text-sm`}>
                                    + {ex.quantity} x {ex.name}
                                </Text>
                            ))}

                            {/* Old Addons Fallback */}
                            {!item.componentsSnapshot && item.addons?.length > 0 && (
                                <Text style={tw`text-gray-500 text-xs italic`}>
                                    Includes: {item.addons.join(', ')}
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Total */}
                <View style={tw`mt-3 flex-row justify-end`}>
                    <Text style={tw`font-bold text-gray-800 text-lg`}>Total: ₹{item.totalAmount}</Text>
                </View>

                {/* Actions */}
                <View style={tw`mt-3 flex-row gap-2`}>
                    {item.status === 'placed' && (
                        <Pressable
                            style={[tw`flex-1 p-3 rounded-lg items-center`, { backgroundColor: primaryColor }]}
                            onPress={() => handleUpdateStatus(item.id, { status: 'confirmed' })}
                        >
                            <Text style={tw`font-bold text-gray-900 text-sm`}>Confirm Order</Text>
                        </Pressable>
                    )}
                    {item.isTrial && item.paymentStatus !== 'paid' && (
                        <Pressable
                            style={[tw`flex-1 p-3 rounded-lg items-center`, { backgroundColor: primaryColor }]}
                            onPress={() => handleUpdateStatus(item.id, { paymentStatus: 'paid' })}
                        >
                            <Text style={tw`font-bold text-gray-900 text-sm`}>Mark Paid</Text>
                        </Pressable>
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
        <View style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={tw`bg-white p-4 pb-2 shadow-sm z-10`}>
                <Text style={tw`text-gray-500 text-xs font-bold uppercase tracking-widest mb-1`}>Kitchen Operations</Text>
                <View style={tw`flex-row items-center justify-between`}>
                    <Pressable onPress={() => changeDate(-1)}>
                        <Text style={tw`text-2xl font-bold text-gray-400`}>{'<'}</Text>
                    </Pressable>
                    <Text style={tw`text-xl font-bold text-gray-800`}>{selectedDate.toDateString()}</Text>
                    <Pressable onPress={() => changeDate(1)}>
                        <Text style={tw`text-2xl font-bold text-gray-400`}>{'>'}</Text>
                    </Pressable>
                </View>
            </View>

            {/* Stats Grid */}
            <View style={tw`p-2 flex-row flex-wrap`}>
                <View style={tw`w-1/2`}><StatCard title="Pending" value={pendingOrders} type={pendingOrders > 0 ? 'danger' : 'neutral'} /></View>
                <View style={tw`w-1/2`}><StatCard title="Total" value={totalOrders} type="success" /></View>
                <View style={tw`w-1/2`}><StatCard title="Revenue" value={`₹${totalRevenue}`} type="neutral" /></View>
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
