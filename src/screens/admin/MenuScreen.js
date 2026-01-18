import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, ActivityIndicator, Alert, Switch } from 'react-native';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getMenuDateId, saveMenu, subscribeToMenu } from '../../services/menuService';
import tw from 'twrnc';

const MealForm = ({ slotConfig, data, onChange }) => {
    const { primaryColor } = useTheme();
    const { label, mode } = slotConfig;

    const updateField = (field, value) => {
        onChange({ ...data, [field]: value });
    };

    const addListItem = (field) => {
        const newList = [...(data[field] || []), { name: '', price: '' }];
        updateField(field, newList);
    };

    const updateListItem = (field, index, subField, value) => {
        const newList = [...(data[field] || [])];
        newList[index][subField] = value;
        updateField(field, newList);
    };

    const removeListItem = (field, index) => {
        const newList = data[field].filter((_, i) => i !== index);
        updateField(field, newList);
    };

    const isActive = data.status === 'SET';

    return (
        <View style={tw`mb-6 border border-gray-200 rounded-2xl p-5 bg-white shadow-sm`}>
            <View style={tw`flex-row justify-between items-center mb-4`}>
                <View>
                    <Text style={tw`text-2xl font-black text-gray-900`}>{label}</Text>
                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest`}>
                        {mode === 'FIXED' ? '🍱 Tiffin / Fixed' : '🍔 Canteen / Menu'}
                    </Text>
                </View>
                <View style={tw`flex-row items-center bg-gray-50 px-3 py-1 rounded-full`}>
                    <Text style={[tw`mr-2 text-[10px] font-black uppercase`, { color: isActive ? '#16a34a' : '#9ca3af' }]}>
                        {isActive ? 'Active' : 'Closed'}
                    </Text>
                    <Switch
                        value={isActive}
                        onValueChange={(val) => updateField('status', val ? 'SET' : 'NOT_SET')}
                        trackColor={{ false: '#e5e7eb', true: primaryColor }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {isActive && (
                <>
                    {mode === 'FIXED' ? (
                        <View style={tw`bg-gray-50 p-4 rounded-xl border border-gray-100`}>
                            <Text style={tw`text-gray-400 mb-2 font-black uppercase tracking-widest text-[10px]`}>Today's Main Sabzi</Text>
                            <TextInput
                                style={tw`bg-white border-2 border-gray-100 rounded-xl p-4 font-bold text-lg text-gray-800`}
                                placeholder="e.g. Aloo Matar"
                                value={data.mainDish || ''}
                                onChangeText={(val) => updateField('mainDish', val)}
                            />
                            <Text style={tw`text-[10px] text-blue-500 mt-2 font-bold italic`}>
                                * Pricing and variants are pulled from your Food Setup settings.
                            </Text>
                        </View>
                    ) : (
                        <View style={tw`bg-gray-50 p-4 rounded-xl border border-gray-100`}>
                            <Text style={tw`text-gray-400 mb-2 font-black uppercase tracking-widest text-[10px]`}>Today's Special Menu</Text>
                            {(data.menuItems || []).map((item, index) => (
                                <View key={index} style={tw`flex-row gap-2 mb-2 items-center`}>
                                    <TextInput
                                        style={tw`flex-[2] bg-white border border-gray-100 rounded-lg p-3 font-bold`}
                                        placeholder="Item e.g. Burger"
                                        value={item.name}
                                        onChangeText={(val) => updateListItem('menuItems', index, 'name', val)}
                                    />
                                    <TextInput
                                        style={tw`flex-1 bg-white border border-gray-100 rounded-lg p-3 font-bold text-center`}
                                        placeholder="₹"
                                        keyboardType="numeric"
                                        value={String(item.price)}
                                        onChangeText={(val) => updateListItem('menuItems', index, 'price', val)}
                                    />
                                    <Pressable onPress={() => removeListItem('menuItems', index)} style={tw`p-2`}>
                                        <Text style={tw`text-red-500 font-bold`}>X</Text>
                                    </Pressable>
                                </View>
                            ))}
                            <Pressable onPress={() => addListItem('menuItems')} style={tw`mt-1`}>
                                <Text style={[{ color: primaryColor }, tw`font-bold text-xs uppercase tracking-widest`]}>+ Add Item</Text>
                            </Pressable>
                        </View>
                    )}

                    <View style={tw`mt-6 pt-4 border-t border-gray-100`}>
                        <Text style={tw`text-gray-400 mb-3 font-black uppercase tracking-widest text-[10px]`}>Today's Optional Extras (One-off)</Text>
                        {(data.extras || []).map((extra, index) => (
                            <View key={index} style={tw`flex-row gap-2 mb-2 items-center`}>
                                <TextInput
                                    style={tw`flex-[2] bg-gray-100 border border-gray-200 rounded-lg p-2 font-medium`}
                                    placeholder="e.g. Buttermilk"
                                    value={extra.name}
                                    onChangeText={(val) => updateListItem('extras', index, 'name', val)}
                                />
                                <TextInput
                                    style={tw`flex-1 bg-gray-100 border border-gray-200 rounded-lg p-2 text-center font-medium`}
                                    placeholder="Price"
                                    keyboardType="numeric"
                                    value={String(extra.price)}
                                    onChangeText={(val) => updateListItem('extras', index, 'price', val)}
                                />
                                <Pressable onPress={() => removeListItem('extras', index)} style={tw`p-2`}>
                                    <Text style={tw`text-gray-400 font-bold`}>X</Text>
                                </Pressable>
                            </View>
                        ))}
                        <Pressable onPress={() => addListItem('extras')} style={tw`mt-1`}>
                            <Text style={[{ color: primaryColor }, tw`font-black text-[10px] uppercase tracking-tighter opacity-70`]}>+ Add One-off Extra</Text>
                        </Pressable>
                    </View>
                </>
            )}
        </View>
    );
};

export const MenuScreen = () => {
    const { tenant } = useTenant();
    const { primaryColor } = useTheme();
    const [menuData, setMenuData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const dateId = getMenuDateId(selectedDate);
    const mealTypes = tenant?.mealTypes || [];

    useEffect(() => {
        if (!tenant?.id) return;

        setLoading(true);
        const unsubscribe = subscribeToMenu(tenant.id, dateId, (data) => {
            const merged = {};
            mealTypes.forEach(m => {
                const slotData = (data || {})[m.id];
                merged[m.id] = slotData || { status: 'NOT_SET', mainDish: '', menuItems: [], extras: [] };
            });
            setMenuData(merged);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenant?.id, dateId, mealTypes.length]);

    const handleSave = async () => {
        setSaving(true);
        const result = await saveMenu(tenant.id, dateId, menuData);
        setSaving(false);
        if (result.success) {
            Alert.alert("Success", "Menu updated successfully!");
        } else {
            Alert.alert("Error", result.error);
        }
    };

    const changeDate = (days) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    if (loading) {
        return (
            <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
                <ActivityIndicator size="large" color={primaryColor} />
            </View>
        );
    }

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            <View style={tw`bg-white p-4 pb-2 shadow-sm z-10`}>
                <Text style={tw`text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1`}>Today's Kitchen Menu</Text>
                <View style={tw`flex-row items-center justify-between`}>
                    <Pressable
                        onPress={() => changeDate(-1)}
                        style={tw`p-2`}
                    >
                        <Text style={tw`text-2xl font-black text-gray-300`}>{'<'}</Text>
                    </Pressable>
                    <View style={tw`items-center`}>
                        <Text style={tw`text-xl font-black text-gray-900`}>{selectedDate.toDateString()}</Text>
                        <Text style={tw`text-[10px] text-gray-400 font-bold`}>Tap to change date</Text>
                    </View>
                    <Pressable
                        onPress={() => changeDate(1)}
                        style={tw`p-2`}
                    >
                        <Text style={tw`text-2xl font-black text-gray-300`}>{'>'}</Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView style={tw`flex-1 p-4 pt-6`} showsVerticalScrollIndicator={false}>
                {mealTypes.map((slot) => (
                    <MealForm
                        key={slot.id}
                        slotConfig={slot}
                        data={menuData[slot.id] || {}}
                        onChange={(newData) => {
                            setMenuData({ ...menuData, [slot.id]: newData });
                        }}
                    />
                ))}

                <Pressable
                    onPress={handleSave}
                    disabled={saving}
                    style={{
                        width: '100%',
                        backgroundColor: primaryColor,
                        borderRadius: 16,
                        padding: 20,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 4,
                        marginBottom: 40
                    }}
                >
                    {saving ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <Text style={tw`text-black font-black text-xl`}>Save Menu</Text>
                    )}
                </Pressable>

                <View style={tw`h-20`} />
            </ScrollView>
        </View>
    );
};
