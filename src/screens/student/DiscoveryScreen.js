import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, Pressable, BackHandler } from 'react-native';
import { getAllKitchens } from '../../services/kitchenService';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import tw from 'twrnc';
import { Search, MapPin, ChefHat, ArrowRight, Navigation2, ChevronDown, X, ChevronLeft } from 'lucide-react-native';
import { INDIAN_STATES, CITIES_BY_STATE, getNormalizedState, getNormalizedCity } from '../../constants/indianLocations';
import { normalizeLocation } from '../../utils/locationNormalizer';

export const DiscoveryScreen = ({ navigation }) => {
    const [kitchens, setKitchens] = useState([]);
    const [allKitchens, setAllKitchens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const { userProfile } = useAuth();
    const { joinedKitchens } = useTenant();

    // State/City Filter States
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [stateSearchText, setStateSearchText] = useState('');
    const [citySearchText, setCitySearchText] = useState('');
    const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

    // Handle back navigation
    const handleGoBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            // Fallback if we can't go back (e.g. initial screen in a stack)
            navigation.navigate('EditLocation', { editMode: true });
        }
    };

    useEffect(() => {
        fetchKitchens();
    }, [userProfile]);

    // Close dropdowns when screen loses focus
    useEffect(() => {
        const unsubscribe = navigation.addListener('blur', () => {
            setStateDropdownOpen(false);
            setCityDropdownOpen(false);
        });
        return unsubscribe;
    }, [navigation]);

    // Handle hardware back button
    useEffect(() => {
        const onBackPress = () => {
            handleGoBack();
            return true; // Prevent default back behavior
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, []);

    // Apply filters whenever any filter changes
    useEffect(() => {
        applyFilters();
    }, [selectedState, selectedCity, searchText, allKitchens, joinedKitchens]);

    const fetchKitchens = async () => {
        setLoading(true);
        const locationFilter = {
            city: userProfile?.city,
            pincode: userProfile?.pincode
        };

        let data = await getAllKitchens('', locationFilter);
        setAllKitchens(data);
        setKitchens(data);
        setLoading(false);
    };

    const applyFilters = () => {
        let results = [...allKitchens];

        // Filter out already joined kitchens
        const joinedKitchenIds = joinedKitchens.map(k => k.id);
        results = results.filter(k => !joinedKitchenIds.includes(k.id));

        // Apply state filter using normalized values
        if (selectedState) {
            const normalizedSelectedState = normalizeLocation(selectedState);
            results = results.filter(k => {
                const kitchenState = k.address?.state || '';
                return kitchenState === normalizedSelectedState;
            });
        }

        // Apply city filter using normalized values
        if (selectedCity) {
            const normalizedSelectedCity = normalizeLocation(selectedCity);
            results = results.filter(k => {
                const kitchenCity = k.address?.city || '';
                return kitchenCity === normalizedSelectedCity;
            });
        }

        // Apply search text filter (kitchen name or city display)
        if (searchText.trim()) {
            const lowerSearch = searchText.toLowerCase();
            results = results.filter(k =>
                (k.name && k.name.toLowerCase().includes(lowerSearch)) ||
                (k.address?.cityDisplay && k.address.cityDisplay.toLowerCase().includes(lowerSearch)) ||
                (k.address?.city && k.address.city.toLowerCase().includes(lowerSearch))
            );
        }

        setKitchens(results);
    };

    // Filter states based on search text
    const filteredStates = INDIAN_STATES.filter(state =>
        state.toLowerCase().includes(stateSearchText.toLowerCase())
    ).slice(0, 5);

    // Filter cities based on selected state and search text
    const filteredCities = selectedState && CITIES_BY_STATE[selectedState]
        ? CITIES_BY_STATE[selectedState].filter(city =>
            city.toLowerCase().includes(citySearchText.toLowerCase())
        ).slice(0, 5)
        : [];

    const handleStateSelect = (state) => {
        setSelectedState(state);
        setStateSearchText(state);
        setStateDropdownOpen(false);
        // Reset city when state changes
        setSelectedCity('');
        setCitySearchText('');
    };

    const handleCitySelect = (city) => {
        setSelectedCity(city);
        setCitySearchText(city);
        setCityDropdownOpen(false);
    };

    const clearStateFilter = () => {
        setSelectedState('');
        setStateSearchText('');
        setSelectedCity('');
        setCitySearchText('');
    };

    const clearCityFilter = () => {
        setSelectedCity('');
        setCitySearchText('');
    };

    const renderKitchen = ({ item }) => (
        <TouchableOpacity
            style={tw`bg-white rounded-2xl mt-5 mb-3 border border-gray-100 overflow-hidden`}
            activeOpacity={0.7}
            onPress={() => {
                setStateDropdownOpen(false);
                setCityDropdownOpen(false);
                navigation.navigate('JoinKitchen', { kitchenCode: item.joinCode });
            }}
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
                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={handleGoBack}
                        style={tw`p-2 bg-gray-50 rounded-full mr-3`}
                    >
                        <ChevronLeft size={20} color="#374151" />
                    </TouchableOpacity>

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

                {/* State/City Filters Row */}
                <View style={tw`flex-row gap-2 mb-3`}>
                    {/* State Dropdown */}
                    <View style={tw`flex-1`}>
                        <Pressable
                            onPress={() => setStateDropdownOpen(!stateDropdownOpen)}
                            style={tw`bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex-row items-center justify-between`}
                        >
                            <Text style={tw`text-xs font-bold ${selectedState ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                                {selectedState || 'State'}
                            </Text>
                            <View style={tw`flex-row items-center gap-1`}>
                                {selectedState && (
                                    <Pressable onPress={clearStateFilter} style={tw`p-0.5`}>
                                        <X size={12} color="#9ca3af" />
                                    </Pressable>
                                )}
                                <ChevronDown size={14} color="#9ca3af" />
                            </View>
                        </Pressable>

                        {/* State Dropdown Menu */}
                        {stateDropdownOpen && (
                            <View style={tw`absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48`}>
                                <TextInput
                                    style={tw`px-3 py-2 text-sm font-bold text-gray-900 border-b border-gray-100`}
                                    placeholder="Search states..."
                                    placeholderTextColor="#9ca3af"
                                    value={stateSearchText}
                                    onChangeText={setStateSearchText}
                                    autoFocus
                                />
                                <ScrollView style={tw`max-h-40`}>
                                    {filteredStates.map((state) => (
                                        <Pressable
                                            key={state}
                                            onPress={() => handleStateSelect(state)}
                                            style={tw`px-3 py-2.5 border-b border-gray-50`}
                                        >
                                            <Text style={tw`text-sm font-bold text-gray-900`}>{state}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    {/* City Dropdown */}
                    <View style={tw`flex-1`}>
                        <Pressable
                            onPress={() => selectedState && setCityDropdownOpen(!cityDropdownOpen)}
                            disabled={!selectedState}
                            style={tw`bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 flex-row items-center justify-between ${!selectedState ? 'opacity-50' : ''}`}
                        >
                            <Text style={tw`text-xs font-bold ${selectedCity ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                                {selectedCity || 'City'}
                            </Text>
                            <View style={tw`flex-row items-center gap-1`}>
                                {selectedCity && (
                                    <Pressable onPress={clearCityFilter} style={tw`p-0.5`}>
                                        <X size={12} color="#9ca3af" />
                                    </Pressable>
                                )}
                                <ChevronDown size={14} color="#9ca3af" />
                            </View>
                        </Pressable>

                        {/* City Dropdown Menu */}
                        {cityDropdownOpen && selectedState && (
                            <View style={tw`absolute top-12 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48`}>
                                <TextInput
                                    style={tw`px-3 py-2 text-sm font-bold text-gray-900 border-b border-gray-100`}
                                    placeholder="Search cities..."
                                    placeholderTextColor="#9ca3af"
                                    value={citySearchText}
                                    onChangeText={setCitySearchText}
                                    autoFocus
                                />
                                <ScrollView style={tw`max-h-40`}>
                                    {filteredCities.map((city) => (
                                        <Pressable
                                            key={city}
                                            onPress={() => handleCitySelect(city)}
                                            style={tw`px-3 py-2.5 border-b border-gray-50`}
                                        >
                                            <Text style={tw`text-sm font-bold text-gray-900`}>{city}</Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>
                </View>

                <View style={tw`bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 flex-row items-center`}>
                    <Search size={16} color="#9ca3af" style={tw`mr-2`} />
                    <TextInput
                        style={tw`flex-1 text-sm font-bold text-gray-900`}
                        placeholder="Search by kitchen name or city..."
                        placeholderTextColor="#9ca3af"
                        value={searchText}
                        onChangeText={setSearchText}
                        onFocus={() => {
                            setStateDropdownOpen(false);
                            setCityDropdownOpen(false);
                        }}
                        selectionColor="#ca8a04"
                    />
                </View>
            </View>

            {/* Content with padding for absolute header */}
            <ScrollView
                style={tw`flex-1`}
                contentContainerStyle={tw`pt-64 px-5 pb-6`}
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
                            No kitchens match your filters.{'\n'}Try adjusting your search or filters.
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
