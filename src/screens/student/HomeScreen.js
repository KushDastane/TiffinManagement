import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { getMenuDateId, subscribeToMenu } from '../../services/menuService';
import { placeOrder } from '../../services/orderService';

export const HomeScreen = () => {
    const { user, userProfile } = useAuth();
    const { tenant } = useTenant();
    const [menu, setMenu] = useState(null);
    const [loading, setLoading] = useState(false);

    const today = new Date();

    useEffect(() => {
        if (!tenant?.id) return;

        const unsubscribe = subscribeToMenu(tenant.id, today, (data) => {
            setMenu(data);
        });
        return () => unsubscribe();
    }, [tenant?.id]);

    const handleOrder = async (item) => {
        if (!user || !tenant) return;

        Alert.alert(
            "Confirm Order",
            `Place order for ${item.mealType === 'lunch' ? 'Lunch' : 'Dinner'}?\nPrice: ₹${item.price}`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: async () => {
                        setLoading(true);
                        const result = await placeOrder(tenant.id, {
                            userId: user.uid,
                            userDisplayName: userProfile?.phoneNumber || user.email, // simple fallback
                            mealType: item.mealType,
                            price: item.price,
                            description: item.description,
                            quantity: 1 // Default to 1 full tiffin
                        });
                        setLoading(false);

                        if (result.error) {
                            Alert.alert("Error", "Failed to place order.");
                        } else {
                            Alert.alert("Success", "Order placed successfully!");
                        }
                    }
                }
            ]
        );
    };

    if (!tenant) return <View className="flex-1 bg-white" />;

    return (
        <ScrollView className="flex-1 bg-gray-50 p-4">
            <View className="mb-6">
                <Text className="text-2xl font-bold text-gray-800">{tenant.name}</Text>
                <Text className="text-gray-500">{today.toDateString()}</Text>
            </View>

            <Text className="text-xl font-bold mb-4 text-gray-800">Today's Menu</Text>

            {(!menu || !menu.items || menu.items.length === 0) ? (
                <View className="bg-white p-6 rounded-xl items-center justify-center border border-gray-200">
                    <Text className="text-gray-500 text-lg">Menu not updated yet.</Text>
                </View>
            ) : (
                menu.items.map((item, index) => (
                    <View key={index} className="bg-white p-4 rounded-xl mb-4 border border-gray-100 shadow-sm">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-lg font-bold capitalize text-gray-800">
                                {item.mealType}
                            </Text>
                            <Text className="text-lg font-bold text-yellow-600">₹{item.price}</Text>
                        </View>
                        <Text className="text-gray-600 mb-4 text-base leading-5">
                            {item.description}
                        </Text>

                        <TouchableOpacity
                            className={`w-full bg-yellow-400 rounded-lg p-3 items-center ${loading ? 'opacity-50' : ''}`}
                            onPress={() => handleOrder(item)}
                            disabled={loading}
                        >
                            <Text className="font-bold text-black text-lg">
                                Order {item.mealType === 'lunch' ? 'Lunch' : 'Dinner'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ))
            )}
        </ScrollView>
    );
};
