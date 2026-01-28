import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, BackHandler } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { createKitchen } from '../../services/kitchenService';
import { updateUserProfile } from '../../services/authService';
import tw from 'twrnc';
import { ChefHat, ArrowRight, ChevronLeft } from 'lucide-react-native';

export const CreateKitchenScreen = () => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [kitchenType, setKitchenType] = useState('DABBA'); // Default Type
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState(false);

    const types = [
        { id: 'DABBA', label: 'Tiffin Service', icon: '🍱', desc: 'Fixed meals (Lunch/Dinner)' }
    ];

    const handleBack = async () => {
        setResetting(true);
        await updateUserProfile(user.uid, { role: null });
        setResetting(false);
    };

    useEffect(() => {
        const onBackPress = () => {
            handleBack();
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Please enter a kitchen name");
            return;
        }

        setLoading(true);
        const result = await createKitchen(user.uid, {
            name: name.trim(),
            kitchenType,
            theme: {
                primaryColor: '#FACC15' // Default
            }
        });
        setLoading(false);

        if (result.error) Alert.alert("Error", result.error);
    };

    return (
        <ScrollView style={tw`flex-1 bg-white p-6`} showsVerticalScrollIndicator={false} contentContainerStyle={tw`items-center justify-center flex-grow pb-10`}>
            {/* Back Button */}
            <TouchableOpacity
                onPress={handleBack}
                style={tw`absolute top-4 left-0 p-2 bg-gray-50 rounded-full z-10`}
                disabled={resetting || loading}
            >
                {resetting ? <ActivityIndicator size="small" color="#9ca3af" /> : <ChevronLeft size={24} color="#374151" />}
            </TouchableOpacity>

            <View style={tw`w-full max-w-[85%]`}>
                <View style={tw`mb-8 items-center`}>
                    <View style={tw`w-14 h-14 bg-gray-900 rounded-2xl items-center justify-center mb-3`}>
                        <ChefHat size={20} color="white" />
                    </View>
                    <Text style={tw`text-2xl font-black text-gray-900 tracking-tight text-center`}>Setup Kitchen</Text>
                    <Text style={tw`text-xs text-gray-400 mt-1 font-bold uppercase tracking-wide text-center`}>Culinary Empire Starts Here</Text>
                </View>

                <View style={tw`bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4 focus:border-yellow-400`}>
                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Kitchen Name</Text>
                    <TextInput
                        style={tw`w-full text-base font-bold text-gray-900`}
                        placeholder="e.g. Grandma's Tiffin"
                        value={name}
                        onChangeText={setName}
                        placeholderTextColor="#9ca3af"
                        selectionColor="#ca8a04"
                    />
                </View>

                {/* Kitchen Type Selection - Compact */}
                <View style={tw`mb-6`}>
                    <View style={tw`flex-row gap-3`}>
                        {types.map((t) => (
                            <TouchableOpacity
                                key={t.id}
                                onPress={() => setKitchenType(t.id)}
                                style={[
                                    tw`flex-1 p-3 rounded-xl border border-gray-100 items-center`,
                                    kitchenType === t.id && tw`bg-gray-900 border-gray-900`
                                ]}
                            >
                                <Text style={tw`text-xl mb-1`}>{t.icon}</Text>
                                <Text style={[tw`font-black text-[10px] uppercase text-center`, { color: kitchenType === t.id ? 'white' : '#111827' }]}>{t.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    onPress={handleCreate}
                    disabled={loading}
                    style={tw`w-full bg-gray-900 rounded-xl py-3.5 shadow-lg items-center flex-row justify-center gap-2`}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <>
                            <Text style={tw`text-white font-black text-xs uppercase tracking-widest`}>Launch Kitchen</Text>
                            <ArrowRight size={14} color="white" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};
