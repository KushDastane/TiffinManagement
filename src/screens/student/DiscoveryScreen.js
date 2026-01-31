import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { getAllKitchens } from '../../services/kitchenService';
import { useAuth } from '../../contexts/AuthContext';
import tw from 'twrnc';
import { Search, MapPin, ChefHat, ArrowRight, Navigation2 } from 'lucide-react-native';

export const DiscoveryScreen = ({ navigation }) => {
    const [kitchens, setKitchens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const { userProfile } = useAuth();

    useEffect(() => {
        if (!userProfile?.city || !userProfile?.pincode) {
            navigation.replace("LocationPicker");
            return;
        }
        fetchKitchens();
    }, [userProfile]);

    const fetchKitchens = async (searchText = '') => {
        setLoading(true);
        const locationFilter = {
            city: userProfile?.city,
            pincode: userProfile?.pincode
        };

        let data = await getAllKitchens(searchText, locationFilter);
        setKitchens(data);
        setLoading(false);
    };

    const handleSearch = (text) => {
        setFilter(text);
        fetchKitchens(text);
    };

    const renderKitchen = ({ item }) => (
        <TouchableOpacity
            style={tw`bg-white rounded-2xl mt-5 mb-3 border border-gray-100 overflow-hidden`}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('JoinKitchen', { kitchenCode: item.joinCode })}
        >
            {/* Kitchen Header */}
            <View style={tw`p-4 pb-3`}>
                <View style={tw`flex-row items-start justify-between mb-2`}>
                    <View style={tw`flex-1 pr-3`}>
                        <Text style={tw`text-lg font-black text-gray-900 leading-tight`}>{item.name}</Text>
                        <View style={tw`flex-row items-center mt-1.5`}>
                            <MapPin size={12} color="#9ca3af" style={tw`mr-1`} />
                            <Text style={tw`text-xs font-bold text-gray-500`} numberOfLines={1}>
                                {item.address?.locality || item.locality || 'Location'}
                            </Text>
                        </View>
                    </View>
                    <View style={tw`flex-col items-end gap-1.5`}>
                        {item.serviceMode && (
                            <View style={tw`${item.serviceMode === 'DELIVERY' ? 'bg-blue-50' : 'bg-orange-50'} px-2.5 py-1 rounded-full`}>
                                <Text style={tw`${item.serviceMode === 'DELIVERY' ? 'text-blue-600' : 'text-orange-600'} text-[9px] font-black uppercase tracking-wider`}>
                                    {item.serviceMode === 'DELIVERY' ? '🚚 Delivery' : '🏃 Pickup'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Address Details */}
                <View style={tw`flex-row items-center mt-2 pt-2 border-t border-gray-50`}>
                    <View style={tw`flex-1 flex-row items-center`}>
                        <View style={tw`bg-gray-50 px-2 py-1 rounded-md mr-2`}>
                            <Text style={tw`text-[10px] font-black text-gray-500 uppercase tracking-wide`}>
                                {item.address?.city || userProfile?.city}
                            </Text>
                        </View>
                        {item.address?.pinCode && (
                            <View style={tw`bg-gray-50 px-2 py-1 rounded-md`}>
                                <Text style={tw`text-[10px] font-black text-gray-500 uppercase tracking-wide`}>
                                    {item.address.pinCode}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {/* Join Button */}
            <View style={tw`bg-yellow-300 px-4 py-3 flex-row items-center justify-between border-t border-yellow-100`}>
                <View style={tw`flex-row items-center`}>
                    <ChefHat size={14} color="#ca8a04" style={tw`mr-2`} />
                    <Text style={tw`text-yellow-700 font-black text-xs uppercase tracking-widest`}>Join Kitchen</Text>
                </View>
                <ArrowRight size={14} color="#ca8a04" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={tw`flex-1 bg-white`}>
            {/* Header - Absolute */}
            <View style={tw`absolute top-0 left-0 right-0 bg-white z-10 pt-12 px-5 pb-4 border-b border-gray-100`}>
                <View style={tw`flex-row items-center justify-between mb-3`}>
                    <View style={tw`flex-1`}>
                        <Text style={tw`text-2xl font-black text-gray-900 tracking-tight`}>Discover</Text>
                        <View style={tw`flex-row items-center mt-1`}>
                            <Navigation2 size={12} color="#9ca3af" style={tw`mr-1`} />
                            <Text style={tw`text-xs font-bold text-gray-500`}>
                                {userProfile?.area || userProfile?.city}, {userProfile?.pincode}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={tw`bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 flex-row items-center`}>
                    <Search size={16} color="#9ca3af" style={tw`mr-2`} />
                    <TextInput
                        style={tw`flex-1 text-sm font-bold text-gray-900`}
                        placeholder="Search kitchens..."
                        placeholderTextColor="#9ca3af"
                        value={filter}
                        onChangeText={handleSearch}
                        selectionColor="#ca8a04"
                    />
                </View>
            </View>

            {/* Content with padding for absolute header */}
            <ScrollView
                style={tw`flex-1`}
                contentContainerStyle={tw`pt-40 px-5 pb-6`}
                showsVerticalScrollIndicator={false}
            >
                {loading ? (
                    <View style={tw`items-center justify-center py-20`}>
                        <ActivityIndicator size="large" color="#FACC15" />
                    </View>
                ) : kitchens.length === 0 ? (
                    <View style={tw`items-center justify-center py-16`}>
                        <View style={tw`w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4`}>
                            <Text style={tw`text-4xl`}>🍱</Text>
                        </View>
                        <Text style={tw`text-gray-900 text-lg font-black text-center mb-1`}>No kitchens found</Text>
                        <Text style={tw`text-gray-400 text-xs font-bold text-center px-8`}>
                            No kitchens are available in your area yet.{'\n'}Check back later or try a different search.
                        </Text>
                    </View>
                ) : (
                    <View>
                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1`}>
                            {kitchens.length} {kitchens.length === 1 ? 'Kitchen' : 'Kitchens'} Found
                        </Text>
                        {kitchens.map((item) => (
                            <View key={item.id}>
                                {renderKitchen({ item })}
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};
