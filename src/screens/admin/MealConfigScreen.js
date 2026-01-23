import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Switch, ActivityIndicator, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTenant } from '../../contexts/TenantContext';
import { updateKitchen } from '../../services/kitchenService';
import { useTheme } from '../../contexts/ThemeContext';
import tw from 'twrnc';

export const MealConfigScreen = () => {
    const { tenant } = useTenant();
    const { primaryColor } = useTheme();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('SCHEDULE'); // SCHEDULE or FOOD_CONFIG

    // State for Meal Slots
    const [mealTypes, setMealTypes] = useState(tenant?.mealTypes || []);

    // State for Global Food Config
    const [fixedMealConfig, setFixedMealConfig] = useState(() => {
        const config = tenant?.fixedMealConfig || {
            global: { variants: [], optionalComponents: [] },
            overrides: {}
        };

        // Ensure Half Dabba (v1) and Full Dabba (v2) exist and are fixed
        const variants = config.global.variants || [];
        const halfDabba = variants.find(v => v.id === 'v1') || { id: 'v1', label: 'Half Dabba', quantities: { roti: 4 }, basePrice: 50 };
        const fullDabba = variants.find(v => v.id === 'v2') || { id: 'v2', label: 'Full Dabba', quantities: { roti: 6 }, basePrice: 80 };

        return {
            ...config,
            global: {
                ...config.global,
                variants: [
                    { ...halfDabba, label: 'Half Dabba' },
                    { ...fullDabba, label: 'Full Dabba' }
                ],
                optionalComponents: config.global.optionalComponents || []
            }
        };
    });

    // Time Picker State
    const [pickerConfig, setPickerConfig] = useState({ show: false, index: null, field: null, value: new Date() });

    const openPicker = (index, field, currentTimeString) => {
        const date = new Date();
        if (currentTimeString) {
            const [hours, minutes] = currentTimeString.split(':');
            date.setHours(parseInt(hours) || 9, parseInt(minutes) || 0, 0, 0);
        } else {
            date.setHours(9, 0, 0, 0);
        }
        setPickerConfig({ show: true, index, field, value: date });
    };

    const onTimeChange = (event, selectedDate) => {
        if (event.type === 'dismissed') {
            setPickerConfig(prev => ({ ...prev, show: false }));
            return;
        }

        const currentDate = selectedDate || pickerConfig.value;
        if (Platform.OS === 'android') {
            setPickerConfig(prev => ({ ...prev, show: false }));
        }

        if (selectedDate) {
            const hours = selectedDate.getHours().toString().padStart(2, '0');
            const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
            const timeString = `${hours}:${minutes}`;
            updateSlot(pickerConfig.index, { [pickerConfig.field]: timeString });

            // Update picker value too to avoid jump
            setPickerConfig(prev => ({ ...prev, value: selectedDate }));
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const result = await updateKitchen(tenant.id, {
            mealTypes,
            fixedMealConfig
        });
        setLoading(false);
        if (result.success) {
            Alert.alert("Success", "Configuration saved!");
        } else {
            Alert.alert("Error", result.error);
        }
    };

    // --- Slot Management ---
    const addSlot = () => {
        const newId = `m_${Date.now()}`;
        setMealTypes([...mealTypes, {
            id: newId,
            label: 'New Slot',
            mode: 'FIXED',
            startTime: '09:00',
            endTime: '11:00',
            allowCustomization: true
        }]);
    };

    const updateSlot = (index, updates) => {
        const newSlots = [...mealTypes];
        newSlots[index] = { ...newSlots[index], ...updates };
        setMealTypes(newSlots);
    };

    const removeSlot = (index) => {
        Alert.alert("Confirm", "Delete this meal slot?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: () => {
                    const newSlots = mealTypes.filter((_, i) => i !== index);
                    setMealTypes(newSlots);
                }
            }
        ]);
    };

    // --- Variant Management (Fixed now) ---
    const updateVariant = (index, updates) => {
        const newConfig = { ...fixedMealConfig };
        newConfig.global.variants[index] = { ...newConfig.global.variants[index], ...updates };
        setFixedMealConfig(newConfig);
    };

    // --- Component Management ---
    const addComponent = () => {
        const newId = `c_${Date.now()}`;
        const newConfig = { ...fixedMealConfig };
        newConfig.global.optionalComponents = [...newConfig.global.optionalComponents, { id: newId, name: 'New Item', price: 0, enabled: true, allowQuantity: false }];
        setFixedMealConfig(newConfig);
    };

    const updateComponent = (index, updates) => {
        const newConfig = { ...fixedMealConfig };
        newConfig.global.optionalComponents[index] = { ...newConfig.global.optionalComponents[index], ...updates };
        setFixedMealConfig(newConfig);
    };

    const removeComponent = (index) => {
        const newConfig = { ...fixedMealConfig };
        newConfig.global.optionalComponents = newConfig.global.optionalComponents.filter((_, i) => i !== index);
        setFixedMealConfig(newConfig);
    };

    return (
        <View style={tw`flex-1 bg-gray-50`}>
            {/* Header */}
            <View style={[tw`bg-white pt-10 px-4 border-b border-gray-100`]}>
                <Text style={tw`text-3xl font-black text-gray-900 mb-4`}>Food Setup</Text>
                <Text style={tw`text-yellow-600 text-[10px] font-black uppercase tracking-widest mb-4`}>Configure Dabba Sizes & Extras</Text>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View>
                    {/* VARIANTS SECTION (Fixed Half/Full) */}
                    <View style={tw`bg-white p-4 rounded-2xl mb-6 shadow-sm border border-gray-100`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <Text style={tw`text-xl font-bold text-gray-800`}>Fixed Dabba Sizes</Text>
                        </View>

                        {fixedMealConfig.global.variants.map((v, idx) => (
                            <View key={v.id} style={tw`mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100`}>
                                <View style={tw`flex-row justify-between mb-3 items-center`}>
                                    <Text style={tw`font-black text-gray-900 text-lg`}>{v.label}</Text>
                                    <Text style={tw`text-[10px] text-gray-400 font-bold uppercase`}>
                                        {v.id === 'v1' ? 'Roti + Sabzi' : 'Roti + Sabzi + Dal + Rice'}
                                    </Text>
                                </View>

                                <View style={tw`flex-row gap-4`}>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-[10px] text-gray-400 mb-1 uppercase font-black`}>Price (₹)</Text>
                                        <TextInput
                                            style={{
                                                backgroundColor: 'white',
                                                borderWidth: 1,
                                                borderColor: '#f3f4f6',
                                                borderRadius: 8,
                                                padding: 12,
                                                fontWeight: 'bold',
                                                color: '#111827'
                                            }}
                                            keyboardType="numeric"
                                            value={String(v.basePrice)}
                                            onChangeText={(text) => updateVariant(idx, { basePrice: Number(text) })}
                                        />
                                    </View>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-[10px] text-gray-400 mb-1 uppercase font-black`}>Roti Count</Text>
                                        <TextInput
                                            style={{
                                                backgroundColor: 'white',
                                                borderWidth: 1,
                                                borderColor: '#f3f4f6',
                                                borderRadius: 8,
                                                padding: 12,
                                                fontWeight: 'bold',
                                                color: '#111827'
                                            }}
                                            keyboardType="numeric"
                                            value={String(v.quantities?.roti || 0)}
                                            onChangeText={(text) => updateVariant(idx, { quantities: { ...v.quantities, roti: Number(text) } })}
                                        />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* OPTIONAL COMPONENTS SECTION */}
                    <View style={tw`bg-white p-4 rounded-2xl mb-6 shadow-sm border border-gray-100`}>
                        <View style={tw`flex-row justify-between items-center mb-4`}>
                            <Text style={tw`text-xl font-bold text-gray-800`}>Optional Extras</Text>
                            <Pressable
                                onPress={addComponent}
                                style={{ padding: 4 }}
                            >
                                <Text style={[{ color: primaryColor }, tw`font-bold`]}>+ Add Extra</Text>
                            </Pressable>
                        </View>

                        {fixedMealConfig.global.optionalComponents.map((c, idx) => (
                            <View key={c.id} style={tw`mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100`}>
                                <View style={tw`flex-row justify-between mb-3 items-center`}>
                                    <TextInput
                                        style={{
                                            flex: 1,
                                            fontWeight: 'bold',
                                            color: '#111827',
                                            marginRight: 8
                                        }}
                                        value={c.name}
                                        onChangeText={(text) => updateComponent(idx, { name: text })}
                                        placeholder="e.g. Extra Rice"
                                    />
                                    <Switch
                                        value={c.enabled}
                                        onValueChange={(val) => updateComponent(idx, { enabled: val })}
                                        thumbColor="#fff"
                                        trackColor={{ false: '#e5e7eb', true: primaryColor }}
                                    />
                                    <Pressable
                                        onPress={() => removeComponent(idx)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        <Text style={tw`text-red-500 font-bold`}>X</Text>
                                    </Pressable>
                                </View>

                                <View style={tw`flex-row gap-4 px-1`}>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-[10px] text-gray-400 mb-1 uppercase font-black`}>Price (₹)</Text>
                                        <TextInput
                                            style={{
                                                backgroundColor: 'white',
                                                borderWidth: 1,
                                                borderColor: '#f3f4f6',
                                                borderRadius: 8,
                                                padding: 12,
                                                fontWeight: 'bold',
                                                color: '#111827'
                                            }}
                                            keyboardType="numeric"
                                            value={String(c.price)}
                                            onChangeText={(text) => updateComponent(idx, { price: Number(text) })}
                                        />
                                    </View>
                                    <View style={tw`flex-1 justify-center`}>
                                        <View style={tw`flex-row items-center pt-5`}>
                                            <Switch
                                                value={c.allowQuantity}
                                                onValueChange={(val) => updateComponent(idx, { allowQuantity: val })}
                                                thumbColor="#fff"
                                                trackColor={{ false: '#e5e7eb', true: primaryColor }}
                                            />
                                            <Text style={tw`text-[9px] text-gray-400 font-black ml-1 uppercase`}>Multi-qty</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                <Pressable
                    onPress={handleSave}
                    disabled={loading}
                    style={{
                        width: '100%',
                        backgroundColor: primaryColor,
                        borderRadius: 16,
                        padding: 16,
                        alignItems: 'center',
                        marginBottom: 80,
                        opacity: loading ? 0.7 : 1,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 4
                    }}
                >
                    {loading ? <ActivityIndicator color="black" /> : <Text style={{ color: '#000', fontWeight: '900', fontSize: 18 }}>Save Configuration</Text>}
                </Pressable>

                <View style={tw`h-20`} />
            </ScrollView>

            {pickerConfig.show && (
                <DateTimePicker
                    value={pickerConfig.value}
                    mode="time"
                    is24Hour={false}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onTimeChange}
                    style={Platform.OS === 'ios' ? { backgroundColor: 'white', position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 } : {}}
                />
            )}

            {/* iOS Close Button for Picker */}
            {Platform.OS === 'ios' && pickerConfig.show && (
                <View style={tw`absolute bottom-[200px] left-0 right-0 bg-gray-100 p-2 z-50 flex-row justify-end border-t border-gray-200`}>
                    <Pressable onPress={() => setPickerConfig(prev => ({ ...prev, show: false }))} style={tw`bg-blue-500 px-4 py-2 rounded-lg`}>
                        <Text style={tw`text-white font-bold`}>Done</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
};
