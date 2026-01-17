import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Switch } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { getMenuDateId, saveMenu, subscribeToMenu } from '../../services/menuService';

const MealForm = ({ slotName, data, onChange }) => {
    // data = { type: 'ROTI_SABZI', status: 'NOT_SET', rotiSabzi: {...}, other: {...}, extras: [] }

    const updateField = (field, value) => {
        onChange({ ...data, [field]: value });
    };

    const updateRotiSabzi = (field, value) => {
        onChange({ ...data, rotiSabzi: { ...data.rotiSabzi, [field]: value } });
    };

    const updateOther = (field, value) => {
        onChange({ ...data, other: { ...data.other, [field]: value } });
    };

    // Extras Helper
    const addExtra = () => {
        const newExtras = [...(data.extras || []), { name: '', price: '' }];
        updateField('extras', newExtras);
    };

    const updateExtra = (index, field, value) => {
        const newExtras = [...(data.extras || [])];
        newExtras[index][field] = value;
        updateField('extras', newExtras);
    };

    const removeExtra = (index) => {
        const newExtras = data.extras.filter((_, i) => i !== index);
        updateField('extras', newExtras);
    };

    const isActive = data.status === 'SET';

    return (
        <View className="mb-6 border border-gray-200 rounded-xl p-4 bg-white">
            <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold capitalize text-gray-800">{slotName}</Text>
                <View className="flex-row items-center">
                    <Text className={`mr-2 font-medium ${isActive ? 'text-green-600' : 'text-gray-400'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                    </Text>
                    <Switch
                        value={isActive}
                        onValueChange={(val) => updateField('status', val ? 'SET' : 'NOT_SET')}
                        trackColor={{ false: '#e5e7eb', true: '#facc15' }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {isActive && (
                <>
                    {/* Meal Type Toggle */}
                    <View className="flex-row mb-4 bg-gray-100 p-1 rounded-lg">
                        <TouchableOpacity
                            className={`flex-1 p-2 rounded-md ${data.type === 'ROTI_SABZI' ? 'bg-white shadow-sm' : ''}`}
                            onPress={() => updateField('type', 'ROTI_SABZI')}
                        >
                            <Text className={`text-center font-bold ${data.type === 'ROTI_SABZI' ? 'text-gray-900' : 'text-gray-500'}`}>
                                Roti-Sabzi (Dabba)
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 p-2 rounded-md ${data.type === 'OTHER' ? 'bg-white shadow-sm' : ''}`}
                            onPress={() => updateField('type', 'OTHER')}
                        >
                            <Text className={`text-center font-bold ${data.type === 'OTHER' ? 'text-gray-900' : 'text-gray-500'}`}>
                                Other (Single)
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Roti Sabzi Form */}
                    {data.type === 'ROTI_SABZI' && (
                        <View>
                            <Text className="text-gray-600 mb-1 font-medium">Sabzi Name</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3"
                                placeholder="e.g. Aloo Gobi"
                                value={data.rotiSabzi?.sabzi || ''}
                                onChangeText={(val) => updateRotiSabzi('sabzi', val)}
                            />

                            <View className="flex-row gap-4 mb-3">
                                <View className="flex-1">
                                    <Text className="text-gray-600 mb-1 font-medium">Half Price (₹)</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center"
                                        placeholder="50"
                                        keyboardType="numeric"
                                        value={String(data.rotiSabzi?.halfPrice || '')}
                                        onChangeText={(val) => updateRotiSabzi('halfPrice', val)}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-600 mb-1 font-medium">Full Price (₹)</Text>
                                    <TextInput
                                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center"
                                        placeholder="80"
                                        keyboardType="numeric"
                                        value={String(data.rotiSabzi?.fullPrice || '')}
                                        onChangeText={(val) => updateRotiSabzi('fullPrice', val)}
                                    />
                                </View>
                            </View>

                            <Text className="text-gray-600 mb-1 font-medium">Addons</Text>
                            <Text className="text-xs text-gray-400 mb-2">Items included in full dabba (comma separated)</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3"
                                placeholder="e.g. Dal, Rice, Salad"
                                value={data.rotiSabzi?.addons?.join(', ') || ''}
                                onChangeText={(val) => updateRotiSabzi('addons', val.split(',').map(s => s.trim()))}
                            />
                        </View>
                    )}

                    {/* Other Item Form */}
                    {data.type === 'OTHER' && (
                        <View>
                            <Text className="text-gray-600 mb-1 font-medium">Item Name</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3"
                                placeholder="e.g. Misal Pav"
                                value={data.other?.itemName || ''}
                                onChangeText={(val) => updateOther('itemName', val)}
                            />

                            <Text className="text-gray-600 mb-1 font-medium">Price (₹)</Text>
                            <TextInput
                                className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3"
                                placeholder="70"
                                keyboardType="numeric"
                                value={String(data.other?.price || '')}
                                onChangeText={(val) => updateOther('price', val)}
                            />
                        </View>
                    )}

                    {/* Extras Section */}
                    <View className="mt-4 border-t border-gray-100 pt-4">
                        <Text className="font-bold text-gray-800 mb-2">Extras / Add-ons</Text>
                        {(data.extras || []).map((extra, index) => (
                            <View key={index} className="flex-row gap-2 mb-2 items-center">
                                <TextInput
                                    className="flex-[2] bg-gray-50 border border-gray-200 rounded-lg p-2"
                                    placeholder="Item Name"
                                    value={extra.name}
                                    onChangeText={(val) => updateExtra(index, 'name', val)}
                                />
                                <TextInput
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2 text-center"
                                    placeholder="Price"
                                    keyboardType="numeric"
                                    value={String(extra.price)}
                                    onChangeText={(val) => updateExtra(index, 'price', val)}
                                />
                                <TouchableOpacity onPress={() => removeExtra(index)} className="p-2">
                                    <Text className="text-red-500 font-bold">X</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity onPress={addExtra} className="mt-2">
                            <Text className="text-blue-600 font-bold">+ Add Extra Item</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

export const MenuScreen = () => {
    const { tenant } = useTenant();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(false);

    // Default Empty State
    const defaultSlot = {
        status: 'NOT_SET',
        type: 'ROTI_SABZI',
        rotiSabzi: { sabzi: '', halfPrice: 50, fullPrice: 80, addons: [] },
        other: { itemName: '', price: '' },
        extras: []
    };

    const [menuData, setMenuData] = useState({
        lunch: { ...defaultSlot },
        dinner: { ...defaultSlot }
    });

    const dateId = getMenuDateId(selectedDate);

    useEffect(() => {
        if (!tenant?.id) return;

        const unsubscribe = subscribeToMenu(tenant.id, selectedDate, (fetchedData) => {
            if (fetchedData) {
                // Merge fetched data with default structure to prevent crashes if fields missing
                setMenuData({
                    lunch: fetchedData.lunch ? { ...defaultSlot, ...fetchedData.lunch } : { ...defaultSlot },
                    dinner: fetchedData.dinner ? { ...defaultSlot, ...fetchedData.dinner } : { ...defaultSlot }
                });
            } else {
                setMenuData({
                    lunch: { ...defaultSlot },
                    dinner: { ...defaultSlot }
                });
            }
        });
        return () => unsubscribe();
    }, [tenant?.id, dateId]);

    const handleSave = async () => {
        if (!tenant?.id) return;
        setLoading(true);
        const result = await saveMenu(tenant.id, selectedDate, menuData);
        setLoading(false);
        if (result.error) {
            Alert.alert("Error", "Failed to save menu");
        } else {
            Alert.alert("Success", "Menu updated!");
        }
    };

    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    return (
        <ScrollView className="flex-1 bg-gray-50 p-4">
            <View className="flex-row items-center justify-between mb-6 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                <TouchableOpacity onPress={() => changeDate(-1)} className="p-2">
                    <Text className="text-xl font-bold text-gray-600">{'<'}</Text>
                </TouchableOpacity>
                <Text className="text-lg font-bold text-gray-800">
                    {selectedDate.toDateString()}
                </Text>
                <TouchableOpacity onPress={() => changeDate(1)} className="p-2">
                    <Text className="text-xl font-bold text-gray-600">{'>'}</Text>
                </TouchableOpacity>
            </View>

            <MealForm
                slotName="Lunch (7AM - 1PM)"
                data={menuData.lunch}
                onChange={(newData) => setMenuData(prev => ({ ...prev, lunch: newData }))}
            />

            <MealForm
                slotName="Dinner (4PM - 9PM)"
                data={menuData.dinner}
                onChange={(newData) => setMenuData(prev => ({ ...prev, dinner: newData }))}
            />

            <TouchableOpacity
                className={`w-full bg-yellow-400 rounded-lg p-4 mb-8 items-center shadow-sm ${loading ? 'opacity-70' : ''}`}
                onPress={handleSave}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <Text className="text-black font-bold text-lg">Save Daily Menu</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};
