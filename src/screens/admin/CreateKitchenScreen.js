import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { createKitchen } from '../../services/kitchenService';

export const CreateKitchenScreen = () => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('#FACC15'); // Default Yellow
    const [kitchenType, setKitchenType] = useState('DABBA'); // Default Type
    const [loading, setLoading] = useState(false);

    const colors = [
        { name: 'Yellow', code: '#FACC15' },
        { name: 'Orange', code: '#F97316' },
        { name: 'Red', code: '#EF4444' },
        { name: 'Green', code: '#22C55E' },
        { name: 'Blue', code: '#3B82F6' },
        { name: 'Purple', code: '#A855F7' },
    ];

    const types = [
        { id: 'DABBA', label: 'Tiffin / Dabba', icon: '🍱', desc: 'Fixed meals (Lunch/Dinner)' },
        { id: 'CANTEEN', label: 'Canteen / Order', icon: '🍔', desc: 'Menu based items (Fast food/Cafe)' }
    ];

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Please enter a kitchen name");
            return;
        }

        setLoading(true);
        const result = await createKitchen(user.uid, {
            name,
            kitchenType,
            theme: {
                primaryColor
            }
        });
        setLoading(false);

        if (result.error) {
            Alert.alert("Error", result.error);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white p-6">
            <View className="pt-8 pb-6">
                <Text className="text-4xl font-black text-gray-900 leading-tight">Create Your Kitchen</Text>
                <Text className="text-gray-500 font-medium text-lg">Setup your brand in seconds.</Text>
            </View>

            {/* General Info */}
            <View className="mb-8">
                <Text className="text-gray-400 mb-2 font-black uppercase tracking-widest text-[10px]">Kitchen Name</Text>
                <TextInput
                    className="w-full border-2 border-gray-100 rounded-2xl p-4 text-xl bg-gray-50 focus:border-yellow-400 font-bold"
                    placeholder="e.g. Grandma's Tiffin"
                    value={name}
                    onChangeText={setName}
                />
            </View>

            {/* Kitchen Type Selection */}
            <View className="mb-8">
                <Text className="text-gray-400 mb-3 font-black uppercase tracking-widest text-[10px]">What do you serve?</Text>
                <View className="flex-row gap-4">
                    {types.map((t) => (
                        <TouchableOpacity
                            key={t.id}
                            onPress={() => setKitchenType(t.id)}
                            style={{
                                flex: 1,
                                padding: 16,
                                borderRadius: 16,
                                borderWidth: 2,
                                alignItems: 'center',
                                backgroundColor: kitchenType === t.id ? '#111827' : '#FFFFFF',
                                borderColor: kitchenType === t.id ? '#111827' : '#F3F4F6'
                            }}
                        >
                            <Text className="text-2xl mb-1">{t.icon}</Text>
                            <Text className={`font-black text-center ${kitchenType === t.id ? 'text-white' : 'text-gray-900'}`}>{t.label}</Text>
                            <Text className={`text-[10px] text-center mt-1 font-medium ${kitchenType === t.id ? 'text-gray-400' : 'text-gray-500'}`}>{t.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Brand Branding */}
            <View className="mb-10">
                <Text className="text-gray-400 mb-3 font-black uppercase tracking-widest text-[10px]">Brand Color</Text>
                <View className="flex-row flex-wrap gap-4">
                    {colors.map((c) => (
                        <TouchableOpacity
                            key={c.code}
                            onPress={() => setPrimaryColor(c.code)}
                            style={{ alignItems: 'center', justifyContent: 'center' }}
                        >
                            <View
                                style={{
                                    backgroundColor: c.code,
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    borderWidth: 4,
                                    borderColor: primaryColor === c.code ? '#111827' : 'transparent'
                                }}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <TouchableOpacity
                onPress={handleCreate}
                disabled={loading}
                style={{
                    width: '100%',
                    backgroundColor: primaryColor,
                    borderRadius: 16,
                    padding: 20,
                    alignItems: 'center',
                    marginBottom: 48,
                    opacity: loading ? 0.7 : 1,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2
                }}
            >
                {loading ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <Text style={{ color: '#000', fontWeight: '900', fontSize: 20 }}>Start My Kitchen</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};
