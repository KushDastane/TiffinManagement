import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { createKitchen } from '../../services/kitchenService';
import tw from 'twrnc';

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
        <ScrollView style={tw`flex-1 bg-white p-6`} showsVerticalScrollIndicator={false}>
            <View style={tw`pt-8 pb-6`}>
                <Text style={tw`text-4xl font-black text-gray-900 leading-tight`}>Create Your Kitchen</Text>
                <Text style={tw`text-gray-500 font-medium text-lg`}>Setup your brand in seconds.</Text>
            </View>

            {/* General Info */}
            <View style={tw`mb-8`}>
                <Text style={tw`text-gray-400 mb-2 font-black uppercase tracking-widest text-[10px]`}>Kitchen Name</Text>
                <TextInput
                    style={tw`w-full border-2 border-gray-100 rounded-2xl p-4 text-xl bg-gray-50 focus:border-yellow-400 font-bold`}
                    placeholder="e.g. Grandma's Tiffin"
                    value={name}
                    onChangeText={setName}
                />
            </View>

            {/* Kitchen Type Selection */}
            <View style={tw`mb-8`}>
                <Text style={tw`text-gray-400 mb-3 font-black uppercase tracking-widest text-[10px]`}>What do you serve?</Text>
                <View style={tw`flex-row gap-4`}>
                    {types.map((t) => (
                        <TouchableOpacity
                            key={t.id}
                            onPress={() => setKitchenType(t.id)}
                            style={[
                                tw`flex-1 p-4 rounded-2xl border-2 items-center`,
                                {
                                    backgroundColor: kitchenType === t.id ? '#111827' : '#FFFFFF',
                                    borderColor: kitchenType === t.id ? '#111827' : '#F3F4F6'
                                }
                            ]}
                        >
                            <Text style={tw`text-2xl mb-1`}>{t.icon}</Text>
                            <Text style={[tw`font-black text-center`, { color: kitchenType === t.id ? 'white' : '#111827' }]}>{t.label}</Text>
                            <Text style={[tw`text-[10px] text-center mt-1 font-medium`, { color: kitchenType === t.id ? '#9ca3af' : '#6b7280' }]}>{t.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Brand Branding */}
            <View style={tw`mb-10`}>
                <Text style={tw`text-gray-400 mb-3 font-black uppercase tracking-widest text-[10px]`}>Brand Color</Text>
                <View style={tw`flex-row flex-wrap gap-4`}>
                    {colors.map((c) => (
                        <TouchableOpacity
                            key={c.code}
                            onPress={() => setPrimaryColor(c.code)}
                            style={tw`items-center justify-center`}
                        >
                            <View
                                style={[
                                    tw`w-12 h-12 rounded-full border-4`,
                                    {
                                        backgroundColor: c.code,
                                        borderColor: primaryColor === c.code ? '#111827' : 'transparent'
                                    }
                                ]}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <TouchableOpacity
                onPress={handleCreate}
                disabled={loading}
                style={[
                    tw`w-full rounded-2xl p-5 items-center mb-12 shadow-sm`,
                    {
                        backgroundColor: primaryColor,
                        opacity: loading ? 0.7 : 1,
                    }
                ]}
            >
                {loading ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <Text style={tw`text-black font-black text-xl`}>Start My Kitchen</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};
