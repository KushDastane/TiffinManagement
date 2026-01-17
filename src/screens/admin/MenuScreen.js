import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { getMenuDateId, saveMenu, subscribeToMenu } from '../../services/menuService';

export const MenuScreen = () => {
    const { tenant } = useTenant();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [lunchDesc, setLunchDesc] = useState('');
    const [lunchPrice, setLunchPrice] = useState('');
    const [dinnerDesc, setDinnerDesc] = useState('');
    const [dinnerPrice, setDinnerPrice] = useState('');
    const [loading, setLoading] = useState(false);

    // Initial load of default prices from tenant config
    useEffect(() => {
        if (tenant?.mealTypes) {
            const lunchType = tenant.mealTypes.find(m => m.id === 'lunch');
            if (lunchType) setLunchPrice(lunchType.price.toString());

            const dinnerType = tenant.mealTypes.find(m => m.id === 'dinner');
            if (dinnerType) setDinnerPrice(dinnerType.price.toString());
        }
    }, [tenant]);

    // Construct date ID
    const dateId = getMenuDateId(selectedDate);

    // Subscribe to menu data for selected date
    useEffect(() => {
        if (!tenant?.id) return;

        const unsubscribe = subscribeToMenu(tenant.id, selectedDate, (menuData) => {
            if (menuData && menuData.items) {
                const lunch = menuData.items.find(i => i.mealType === 'lunch');
                const dinner = menuData.items.find(i => i.mealType === 'dinner');

                setLunchDesc(lunch ? lunch.description : '');
                if (lunch && lunch.price) setLunchPrice(lunch.price.toString());

                setDinnerDesc(dinner ? dinner.description : '');
                if (dinner && dinner.price) setDinnerPrice(dinner.price.toString());
            } else {
                // Reset if no menu exists for this day
                setLunchDesc('');
                setDinnerDesc('');
                // Keep default prices
            }
        });

        return () => unsubscribe();
    }, [tenant?.id, dateId]);

    const handleSave = async () => {
        if (!tenant?.id) return;
        setLoading(true);

        const items = [];
        if (lunchDesc.trim()) {
            items.push({
                mealType: 'lunch',
                description: lunchDesc,
                price: parseFloat(lunchPrice) || 0
            });
        }
        if (dinnerDesc.trim()) {
            items.push({
                mealType: 'dinner',
                description: dinnerDesc,
                price: parseFloat(dinnerPrice) || 0
            });
        }

        const result = await saveMenu(tenant.id, selectedDate, items);
        setLoading(false);

        if (result.error) {
            Alert.alert("Error", "Failed to save menu");
        } else {
            Alert.alert("Success", "Menu updated!");
        }
    };

    // Simple Date Switcher (Today, +1, +2...)
    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    return (
        <ScrollView className="flex-1 bg-white p-4">
            {/* Date Header */}
            <View className="flex-row items-center justify-between mb-6 bg-gray-50 p-2 rounded-lg">
                <TouchableOpacity onPress={() => changeDate(-1)} className="p-2">
                    <Text className="text-xl font-bold text-gray-600">{'<'}</Text>
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-800">
                    {selectedDate.toDateString()}
                </Text>
                <TouchableOpacity onPress={() => changeDate(1)} className="p-2">
                    <Text className="text-xl font-bold text-gray-600">{'>'}</Text>
                </TouchableOpacity>
            </View>

            {/* Lunch Section */}
            <View className="mb-6 border border-gray-200 rounded-xl p-4">
                <View className="flex-row justify-between mb-2">
                    <Text className="text-lg font-bold text-orange-600">Lunch</Text>
                    <View className="flex-row items-center">
                        <Text className="text-gray-500 mr-1">₹</Text>
                        <TextInput
                            className="bg-gray-100 p-1 w-16 text-center rounded"
                            value={lunchPrice}
                            onChangeText={setLunchPrice}
                            keyboardType="numeric"
                        />
                    </View>
                </View>
                <TextInput
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 min-h-[80px] text-base"
                    placeholder="E.g. 3 Roti, Palak Paneer, Rice"
                    multiline
                    value={lunchDesc}
                    onChangeText={setLunchDesc}
                />
            </View>

            {/* Dinner Section */}
            <View className="mb-8 border border-gray-200 rounded-xl p-4">
                <View className="flex-row justify-between mb-2">
                    <Text className="text-lg font-bold text-blue-900">Dinner</Text>
                    <View className="flex-row items-center">
                        <Text className="text-gray-500 mr-1">₹</Text>
                        <TextInput
                            className="bg-gray-100 p-1 w-16 text-center rounded"
                            value={dinnerPrice}
                            onChangeText={setDinnerPrice}
                            keyboardType="numeric"
                        />
                    </View>
                </View>
                <TextInput
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 min-h-[80px] text-base"
                    placeholder="E.g. Masala Khichdi, Kadhi"
                    multiline
                    value={dinnerDesc}
                    onChangeText={setDinnerDesc}
                />
            </View>

            <TouchableOpacity
                className={`w-full bg-yellow-400 rounded-lg p-4 items-center shadow-sm ${loading ? 'opacity-70' : ''}`}
                onPress={handleSave}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <Text className="text-black font-bold text-lg">Save Menu</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};
