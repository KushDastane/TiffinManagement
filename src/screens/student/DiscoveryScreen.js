import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getAllKitchens } from '../../services/kitchenService';
import { useAuth } from '../../contexts/AuthContext';
import tw from 'twrnc';

export const DiscoveryScreen = ({ navigation }) => {
    const [kitchens, setKitchens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const { userProfile } = useAuth();

    useEffect(() => {
        fetchKitchens();
    }, []);

    const fetchKitchens = async (searchText = '') => {
        setLoading(true);
        let data = await getAllKitchens(searchText);

        // Hard Filter by Student Pincode
        if (userProfile?.pincode) {
            data = data.filter(k => k.address?.pinCode === userProfile.pincode);
        }

        setKitchens(data);
        setLoading(false);
    };

    const handleSearch = (text) => {
        setFilter(text);
        fetchKitchens(text);
    };

    const renderKitchen = ({ item }) => (
        <View style={tw`bg-white p-5 rounded-2xl mb-4 shadow-sm border border-gray-100`}>
            <View style={tw`flex-row justify-between items-start`}>
                <View style={tw`flex-1`}>
                    <Text style={tw`text-2xl font-extrabold text-gray-800`}>{item.name}</Text>
                    <View style={tw`flex-row items-center mt-1`}>
                        <Text style={tw`text-gray-500 font-medium`}>
                            {item.address
                                ? `${item.address.city}${item.address.line1 ? `, ${item.address.line1}` : ''}`
                                : (item.area || item.locality || 'Location not specified')
                            }
                        </Text>
                    </View>
                    {item.address?.pinCode && (
                        <Text style={tw`text-gray-400 text-xs mt-0.5`}>PIN: {item.address.pinCode}</Text>
                    )}
                </View>
                <View style={tw`bg-green-50 px-3 py-1 rounded-full border border-green-100`}>
                    <Text style={tw`text-green-600 text-[10px] font-extrabold uppercase tracking-wider`}>Active</Text>
                </View>
            </View>

            <View style={tw`mt-6`}>
                <TouchableOpacity
                    style={tw`bg-yellow-400 p-4 rounded-xl items-center shadow-sm`}
                    onPress={() => navigation.navigate('JoinKitchen', { kitchenCode: item.joinCode })}
                >
                    <Text style={tw`font-black text-gray-900 uppercase tracking-widest text-xs`}>Join Kitchen</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={tw`flex-1 bg-white p-4`}>
            <View style={tw`pt-10 mb-6`}>
                <Text style={tw`text-4xl font-black text-gray-900`}>Discovery</Text>
                <Text style={tw`text-gray-500 text-lg`}>Kitchens in {userProfile?.city} ({userProfile?.pincode})</Text>
            </View>

            <TextInput
                style={tw`bg-gray-50 p-5 rounded-2xl mb-6 border border-gray-100 text-lg shadow-sm focus:border-yellow-400`}
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
                        <View style={tw`items-center justify-center py-20`}>
                            <View style={tw`w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4`}>
                                <Text style={tw`text-4xl`}>📍</Text>
                            </View>
                            <Text style={tw`text-gray-400 text-lg font-bold text-center`}>No kitchens found{'\n'}in your area yet.</Text>
                            <Text style={tw`text-gray-400 text-xs mt-2 text-center`}>Try searching for a specific name{'\n'}or check back later.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};
