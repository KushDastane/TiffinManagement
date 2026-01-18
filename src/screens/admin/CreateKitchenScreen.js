import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { createKitchen } from '../../services/kitchenService';

export const CreateKitchenScreen = () => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [address, setAddress] = useState({
        line1: '',
        city: '',
        state: '',
        pinCode: ''
    });
    const [primaryColor, setPrimaryColor] = useState('#FACC15'); // Default Yellow
    const [loading, setLoading] = useState(false);

    // Common Indian states list for simple selection or suggestion (optional, keeping text input for now)
    // Simplified color options
    const colors = [
        { name: 'Yellow', code: '#FACC15' },
        { name: 'Orange', code: '#F97316' },
        { name: 'Red', code: '#EF4444' },
        { name: 'Green', code: '#22C55E' },
        { name: 'Blue', code: '#3B82F6' },
        { name: 'Purple', code: '#A855F7' },
    ];

    // Default meal types
    const [mealTypes, setMealTypes] = useState([
        { id: 'lunch', label: 'Lunch', price: 60 },
        { id: 'dinner', label: 'Dinner', price: 60 }
    ]);

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Please enter a kitchen name");
            return;
        }

        if (!address.line1.trim() || !address.city.trim() || !address.pinCode.trim()) {
            Alert.alert("Error", "Address, City and PIN Code are mandatory");
            return;
        }

        setLoading(true);
        const result = await createKitchen(user.uid, {
            name,
            address,
            mealTypes,
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
        <ScrollView className="flex-1 bg-white p-4">
            <View className="pt-8 pb-6">
                <Text className="text-3xl font-extrabold text-gray-800">Setup Your Kitchen</Text>
                <Text className="text-gray-500">Configure your brand and location.</Text>
            </View>

            <View className="mb-8">
                <Text className="text-gray-600 mb-2 font-bold uppercase tracking-wider text-xs">General Info</Text>
                <TextInput
                    className="w-full border border-gray-200 rounded-xl p-4 mb-4 text-lg bg-gray-50 focus:border-yellow-400"
                    placeholder="Kitchen Name (e.g. Mavshi's Kitchen)"
                    value={name}
                    onChangeText={setName}
                />
            </View>

            <View className="mb-8">
                <Text className="text-gray-600 mb-2 font-bold uppercase tracking-wider text-xs">Location Details</Text>
                <TextInput
                    className="w-full border border-gray-200 rounded-xl p-4 mb-3 bg-gray-50"
                    placeholder="Address Line (House/Street/Area)"
                    value={address.line1}
                    onChangeText={(text) => setAddress({ ...address, line1: text })}
                />
                <View className="flex-row space-x-3 mb-3">
                    <TextInput
                        className="flex-1 border border-gray-200 rounded-xl p-4 bg-gray-50"
                        placeholder="City"
                        value={address.city}
                        onChangeText={(text) => setAddress({ ...address, city: text })}
                    />
                    <TextInput
                        className="flex-1 border border-gray-200 rounded-xl p-4 bg-gray-50"
                        placeholder="State"
                        value={address.state}
                        onChangeText={(text) => setAddress({ ...address, state: text })}
                    />
                </View>
                <TextInput
                    className="w-full border border-gray-200 rounded-xl p-4 bg-gray-50"
                    placeholder="PIN Code"
                    keyboardType="numeric"
                    maxLength={6}
                    value={address.pinCode}
                    onChangeText={(text) => setAddress({ ...address, pinCode: text })}
                />
            </View>

            <View className="mb-8">
                <Text className="text-gray-600 mb-3 font-bold uppercase tracking-wider text-xs">Brand Branding</Text>
                <View className="flex-row flex-wrap">
                    {colors.map((c) => (
                        <TouchableOpacity
                            key={c.code}
                            onPress={() => setPrimaryColor(c.code)}
                            className="mr-3 mb-3 items-center justify-center"
                        >
                            <View
                                style={{ backgroundColor: c.code }}
                                className={`w-12 h-12 rounded-full border-4 ${primaryColor === c.code ? 'border-gray-800' : 'border-transparent'}`}
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View className="mb-10">
                <Text className="text-gray-600 mb-3 font-bold uppercase tracking-wider text-xs">Default Meal Prices</Text>
                {mealTypes.map((meal, index) => (
                    <View key={meal.id} className="flex-row items-center justify-between bg-gray-50 p-4 rounded-xl mb-2 border border-gray-100">
                        <Text className="font-bold text-gray-700">{meal.label}</Text>
                        <TextInput
                            className="font-bold text-green-600 w-20 text-right"
                            value={String(meal.price)}
                            keyboardType="numeric"
                            onChangeText={(text) => {
                                const newTypes = [...mealTypes];
                                newTypes[index].price = parseInt(text) || 0;
                                setMealTypes(newTypes);
                            }}
                        />
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={{ backgroundColor: primaryColor }}
                className={`w-full rounded-2xl p-5 items-center shadow-lg mb-10 ${loading ? 'opacity-70' : ''}`}
                onPress={handleCreate}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-gray-900 font-extrabold text-xl">Start My Kitchen</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};
