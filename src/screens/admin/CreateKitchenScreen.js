import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { createKitchen } from '../../services/kitchenService';

export const CreateKitchenScreen = () => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

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

        setLoading(true);
        const result = await createKitchen(user.uid, {
            name,
            mealTypes,
            themeColor: '#FACC15' // Default Yellow
        });
        setLoading(false);

        if (result.error) {
            Alert.alert("Error", result.error);
        } else {
            // Success! The User/Tenant Context will pick up the change 
            // and redirect to AdminStack automatically?
            // Wait, CreateKitchenScreen is usually INSIDE AuthStack or AdminStack?
            // If user has role 'admin' but no kitchen, RootNavigator needs to decide where to go.
            // Currently RootNavigator updates: if admin -> AdminStack.
            // But if AdminStack needs a kitchen, we might need to handle the "Empty State" inside AdminStack.
            // OR we treat "CreateKitchen" as part of the 'AdminStack' if 'currentKitchenId' is missing.
        }
    };

    return (
        <ScrollView className="flex-1 bg-white p-4">
            <Text className="text-2xl font-bold mb-6 text-gray-800">Setup Your Kitchen</Text>

            <Text className="text-gray-600 mb-2 font-medium">Kitchen Name</Text>
            <TextInput
                className="w-full border border-gray-300 rounded-lg p-3 mb-6 text-lg bg-gray-50 focus:border-yellow-400"
                placeholder="Aadi's Kitchen"
                value={name}
                onChangeText={setName}
            />

            <Text className="text-gray-600 mb-2 font-medium">Default Meal Settings</Text>
            <View className="mb-6">
                {mealTypes.map((meal, index) => (
                    <View key={meal.id} className="flex-row items-center justify-between bg-gray-50 p-3 rounded-lg mb-2 border border-gray-200">
                        <Text className="font-semibold text-lg">{meal.label}</Text>
                        <Text className="text-gray-600">₹{meal.price}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                className={`w-full bg-yellow-400 rounded-lg p-4 items-center shadow-sm ${loading ? 'opacity-70' : ''}`}
                onPress={handleCreate}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="black" />
                ) : (
                    <Text className="text-black font-bold text-lg">Create Kitchen</Text>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};
