import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Switch, ActivityIndicator, Alert } from 'react-native';
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
            {/* Tab Header */}
            <View style={tw`bg-white pt-10 px-4 border-b border-gray-100`}>
                <Text style={tw`text-3xl font-black text-gray-900 mb-4`}>Food Setup</Text>
                <View style={tw`flex-row gap-6 mb-2`}>
                    <Pressable
                        onPress={() => setActiveTab('SCHEDULE')}
                        style={[
                            {
                                paddingBottom: 8,
                                borderBottomWidth: activeTab === 'SCHEDULE' ? 4 : 0,
                                borderBottomColor: activeTab === 'SCHEDULE' ? primaryColor : 'transparent'
                            }
                        ]}
                    >
                        <Text style={[
                            tw`font-black uppercase tracking-widest text-[12px]`,
                            activeTab === 'SCHEDULE' ? tw`text-gray-900` : tw`text-gray-400`
                        ]}>The Schedule</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setActiveTab('FOOD_CONFIG')}
                        style={[
                            {
                                paddingBottom: 8,
                                borderBottomWidth: activeTab === 'FOOD_CONFIG' ? 4 : 0,
                                borderBottomColor: activeTab === 'FOOD_CONFIG' ? primaryColor : 'transparent'
                            }
                        ]}
                    >
                        <Text style={[
                            tw`font-black uppercase tracking-widest text-[12px]`,
                            activeTab === 'FOOD_CONFIG' ? tw`text-gray-900` : tw`text-gray-400`
                        ]}>Meal Details</Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16 }}
            >

                {activeTab === 'SCHEDULE' ? (
                    <View>
                        <View style={tw`flex-row justify-between items-center mb-4 mt-2 px-1`}>
                            <Text style={tw`text-xl font-bold text-gray-800`}>Meal Slots</Text>
                            <Pressable
                                onPress={addSlot}
                                style={{
                                    backgroundColor: `${primaryColor}20`,
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 999
                                }}
                            >
                                <Text style={[{ color: primaryColor }, tw`font-bold`]}>+ Add Slot</Text>
                            </Pressable>
                        </View>

                        {mealTypes.map((m, idx) => (
                            <View key={m.id} style={tw`bg-white p-4 rounded-2xl mb-4 shadow-sm border border-gray-100`}>
                                <View style={tw`flex-row justify-between mb-4 items-center`}>
                                    <TextInput
                                        style={{
                                            fontSize: 18,
                                            fontWeight: '900',
                                            color: '#1f2937', // text-gray-800
                                            flex: 1
                                        }}
                                        value={m.label}
                                        onChangeText={(text) => updateSlot(idx, { label: text })}
                                        placeholder="Slot Name"
                                    />
                                    <Pressable
                                        onPress={() => removeSlot(idx)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        <Text style={tw`text-red-500 font-bold`}>Delete</Text>
                                    </Pressable>
                                </View>

                                <View style={tw`flex-row gap-4 mb-4`}>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-[10px] text-gray-400 font-black mb-1 uppercase tracking-widest`}>Opens At</Text>
                                        <TextInput
                                            style={{
                                                backgroundColor: '#f9fafb', // bg-gray-50
                                                borderWidth: 1,
                                                borderColor: '#f3f4f6', // border-gray-100
                                                borderRadius: 12, // rounded-xl
                                                padding: 12, // p-3
                                                fontWeight: 'bold' // font-bold
                                            }}
                                            value={m.startTime}
                                            onChangeText={(text) => updateSlot(idx, { startTime: text })}
                                            placeholder="HH:MM"
                                        />
                                    </View>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-[10px] text-gray-400 font-black mb-1 uppercase tracking-widest`}>Closes At</Text>
                                        <TextInput
                                            style={{
                                                backgroundColor: '#f9fafb', // bg-gray-50
                                                borderWidth: 1,
                                                borderColor: '#f3f4f6', // border-gray-100
                                                borderRadius: 12, // rounded-xl
                                                padding: 12, // p-3
                                                fontWeight: 'bold' // font-bold
                                            }}
                                            value={m.endTime}
                                            onChangeText={(text) => updateSlot(idx, { endTime: text })}
                                            placeholder="HH:MM"
                                        />
                                    </View>
                                </View>

                                <View style={tw`flex-row justify-between items-center bg-gray-50 p-3 rounded-xl`}>
                                    <View style={tw`flex-row items-center`}>
                                        <View style={{ backgroundColor: '#111827', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 }}>
                                            <Text style={{ fontWeight: 'bold', fontSize: 12, color: '#FFFFFF' }}>Tiffin Slot</Text>
                                        </View>
                                        <Text style={tw`text-[10px] text-gray-400 font-bold ml-3 uppercase`}>Fixed Structure</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : (
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
                )}

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
        </View>
    );
};
