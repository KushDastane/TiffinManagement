import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getAllKitchens } from '../../services/kitchenService';
import { useAuth } from '../../contexts/AuthContext';

export const DiscoveryScreen = ({ navigation }) => {
    const [kitchens, setKitchens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetchKitchens();
    }, []);

    const fetchKitchens = async (searchText = '') => {
        setLoading(true);
        const data = await getAllKitchens(searchText);
        setKitchens(data);
        setLoading(false);
    };

    const handleSearch = (text) => {
        setFilter(text);
        fetchKitchens(text);
    };

    const renderKitchen = ({ item }) => (
        <View className="bg-white p-5 rounded-2xl mb-4 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-start">
                <View className="flex-1">
                    <Text className="text-2xl font-extrabold text-gray-800">{item.name}</Text>
                    <View className="flex-row items-center mt-1">
                        <Text className="text-gray-500 font-medium">
                            {item.address
                                ? `${item.address.city}${item.address.line1 ? `, ${item.address.line1}` : ''}`
                                : (item.area || item.locality || 'Location not specified')
                            }
                        </Text>
                    </View>
                    {item.address?.pinCode && (
                        <Text className="text-gray-400 text-xs mt-0.5">PIN: {item.address.pinCode}</Text>
                    )}
                </View>
                <View className="bg-green-50 px-3 py-1 rounded-full border border-green-100">
                    <Text className="text-green-600 text-[10px] font-extrabold uppercase tracking-wider">Active</Text>
                </View>
            </View>

            <View className="flex-row mt-6 space-x-3">
                <TouchableOpacity
                    className="flex-1 bg-yellow-400 p-4 rounded-xl items-center shadow-sm"
                    onPress={() => navigation.navigate('TrialOrder', { kitchen: item })}
                >
                    <Text className="font-bold text-gray-900">Try Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    className="flex-1 bg-white p-4 rounded-xl items-center border border-gray-200"
                    onPress={() => navigation.navigate('JoinKitchen', { kitchenCode: item.joinCode })}
                >
                    <Text className="font-bold text-gray-700">Join</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View className="flex-1 bg-white p-4">
            <View className="pt-10 mb-6">
                <Text className="text-4xl font-black text-gray-900">Discover</Text>
                <Text className="text-gray-500 text-lg">Taste home-cooked meals near you.</Text>
            </View>

            <TextInput
                className="bg-gray-50 p-5 rounded-2xl mb-6 border border-gray-100 text-lg shadow-sm focus:border-yellow-400"
                placeholder="Search by City, PIN, or Kitchen Name"
                placeholderTextColor="#9ca3af"
                value={filter}
                onChangeText={handleSearch}
            />

            {loading ? (
                <ActivityIndicator size="large" color="#EAB308" />
            ) : (
                <FlatList
                    data={kitchens}
                    renderItem={renderKitchen}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-10">
                            <Text className="text-gray-400 text-lg">No kitchens found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};
