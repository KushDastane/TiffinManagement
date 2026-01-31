import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, BackHandler, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../../contexts/AuthContext';
import { createKitchen } from '../../services/kitchenService';
import { updateUserProfile } from '../../services/authService';
import { normalizeLocation } from '../../utils/locationNormalizer';
import { INDIAN_STATES, CITIES_BY_STATE } from '../../constants/indianLocations';
import tw from 'twrnc';
import { ChefHat, ArrowRight, ChevronLeft, Navigation, MapPin, Phone, Info, CheckCircle2, ChevronDown, X } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export const CreateKitchenScreen = () => {
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [building, setBuilding] = useState('');
    const [locality, setLocality] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [pincode, setPincode] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [serviceMode, setServiceMode] = useState('DELIVERY');
    const [kitchenType, setKitchenType] = useState('DABBA');
    const [loading, setLoading] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [autoDetected, setAutoDetected] = useState(false);

    // Dropdown states
    const [stateSearchText, setStateSearchText] = useState('');
    const [citySearchText, setCitySearchText] = useState('');
    const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
    const [cityDropdownOpen, setCityDropdownOpen] = useState(false);

    const types = [
        {
            id: 'DABBA',
            label: 'Tiffin Service',
            icon: '🍱',
            desc: 'Best for standard lunch/dinner subscription models.',
            color: 'bg-yellow-50',
            borderColor: 'border-yellow-400'
        }
    ];

    const serviceModes = [
        { id: 'DELIVERY', label: 'Home Delivery', icon: '🚚', desc: 'You deliver to students' },
        { id: 'PICKUP', label: 'Self Pickup', icon: '🏃', desc: 'Students collect from you' }
    ];

    const handleBack = async () => {
        if (step > 1) {
            setStep(step - 1);
            return;
        }
        setResetting(true);
        await updateUserProfile(user.uid, { role: null });
        setResetting(false);
    };

    const nextStep = () => {
        if (step === 1) {
            if (!name.trim()) return Alert.alert("Error", "Please enter your kitchen name");
            setStep(2);
        } else if (step === 2) {
            if (!building.trim()) return Alert.alert("Error", "Building/Shop number is required");
            if (!locality.trim()) return Alert.alert("Error", "Locality/Area is required");
            if (!state.trim()) return Alert.alert("Error", "State is required");
            if (!city.trim()) return Alert.alert("Error", "City is required");
            if (!pincode.trim() || pincode.length !== 6) return Alert.alert("Error", "Valid 6-digit Pincode is required");
            setStep(3);
        }
    };

    useEffect(() => {
        const onBackPress = () => {
            handleBack();
            return true;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [step]);

    const detectLocation = async () => {
        try {
            setDetecting(true);
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert("Permission Denied", "Please allow location access to auto-fill your address.");
                setDetecting(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
            const { latitude, longitude } = location.coords;

            // Reverse Geocode using Nominatim (Free)
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
                {
                    headers: {
                        'User-Agent': 'DabbaMe-App'
                    }
                }
            );
            const data = await response.json();

            if (data && data.address) {
                const addr = data.address;
                const detectedCity = addr.city || addr.town || addr.village || addr.suburb || '';
                const detectedState = addr.state || '';
                const detectedPin = addr.postcode || '';
                const detectedLocality = addr.neighbourhood || addr.suburb || addr.road || '';
                const detectedBuilding = addr.house_number || '';

                setCity(detectedCity);
                setCitySearchText(detectedCity);
                setState(detectedState);
                setStateSearchText(detectedState);
                setPincode(detectedPin);
                setLocality(detectedLocality);
                if (detectedBuilding) setBuilding(detectedBuilding);
                setAutoDetected(true);

                if (!detectedCity || !detectedPin || !detectedState) {
                    Alert.alert("Partial Detection", "We found your location but please verify all address details.");
                } else {
                    Alert.alert("Location Detected", "Please verify your address is correct.");
                }
            }
        } catch (error) {
            console.error("Location detection error:", error);
            Alert.alert("Error", "Could not detect location. Please enter manually.");
        } finally {
            setDetecting(false);
        }
    };

    // Dropdown helper functions
    const handleStateSelect = (selectedState) => {
        setState(selectedState);
        setStateSearchText(selectedState);
        setStateDropdownOpen(false);
        // Reset city when state changes
        setCity('');
        setCitySearchText('');
    };

    const handleCitySelect = (selectedCity) => {
        setCity(selectedCity);
        setCitySearchText(selectedCity);
        setCityDropdownOpen(false);
    };

    const clearStateFilter = () => {
        setState('');
        setStateSearchText('');
        setCity('');
        setCitySearchText('');
    };

    const clearCityFilter = () => {
        setCity('');
        setCitySearchText('');
    };

    // Filter states based on search text
    const filteredStates = INDIAN_STATES.filter(s =>
        s.toLowerCase().includes(stateSearchText.toLowerCase())
    ).slice(0, 5);

    // Filter cities based on selected state and search text
    const filteredCities = state && CITIES_BY_STATE[state]
        ? CITIES_BY_STATE[state].filter(c =>
            c.toLowerCase().includes(citySearchText.toLowerCase())
        ).slice(0, 5)
        : [];

    const handleCreate = async () => {
        if (!phone.trim() || phone.length < 10) {
            Alert.alert("Error", "Please enter a valid 10-digit phone number");
            return;
        }

        setLoading(true);
        const result = await createKitchen(user.uid, {
            name: name.trim(),
            address: {
                building: building.trim(),
                locality: locality.trim(),
                city: normalizeLocation(city),
                cityDisplay: city.trim(),
                state: normalizeLocation(state),
                stateDisplay: state.trim(),
                pinCode: pincode.trim()
            },
            phone: phone.trim(),
            whatsapp: whatsapp.trim() || phone.trim(),
            serviceMode,
            kitchenType,
            theme: {
                primaryColor: '#FACC15' // Default
            }
        });
        setLoading(false);

        if (result.error) Alert.alert("Error", result.error);
    };

    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            {/* Header & Progress */}
            <View style={tw`px-6 pt-4 pb-2 flex-row items-center justify-between`}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={tw`p-2 bg-gray-50 rounded-full`}
                    disabled={resetting || loading}
                >
                    {resetting ? <ActivityIndicator size="small" color="#9ca3af" /> : <ChevronLeft size={20} color="#374151" />}
                </TouchableOpacity>

                <View style={tw`flex-1 px-8`}>
                    <View style={tw`h-1 w-full bg-gray-100 rounded-full overflow-hidden`}>
                        <Animated.View
                            layout={Layout.springify()}
                            style={[tw`h-full bg-yellow-400`, { width: `${(step / 3) * 100}%` }]}
                        />
                    </View>
                </View>

                <View style={tw`w-10 items-center`}>
                    <Text style={tw`text-[10px] font-black text-gray-400`}>{step}/3</Text>
                </View>
            </View>

            <ScrollView
                style={tw`flex-1`}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={tw`px-6 pt-6 pb-10`}
            >
                {step === 1 && (
                    <Animated.View entering={FadeIn} exiting={FadeOut} style={tw`w-full`}>
                        <View style={tw`mb-10`}>
                            <Text style={tw`text-3xl font-black text-gray-900 tracking-tight`}>Let's name your{"\n"}Kitchen</Text>
                            <Text style={tw`text-gray-400 mt-2 font-bold text-xs uppercase tracking-widest`}>Step 1: Identity</Text>
                        </View>

                        <View style={tw`bg-gray-50 rounded-3xl p-6 mb-8 border border-gray-100`}>
                            <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1`}>Display Name</Text>
                            <TextInput
                                style={tw`w-full text-xl font-bold text-gray-900 py-1`}
                                placeholder="e.g. Grandma's Tiffin"
                                value={name}
                                onChangeText={setName}
                                placeholderTextColor="#9ca3af"
                                autoFocus
                            />
                        </View>

                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1`}>Kitchen Type</Text>
                        <View style={tw`gap-4`}>
                            {types.map((t) => (
                                <TouchableOpacity
                                    key={t.id}
                                    onPress={() => setKitchenType(t.id)}
                                    style={[
                                        tw`p-5 rounded-3xl flex-row items-center gap-4 border-2`,
                                        kitchenType === t.id ? tw`bg-yellow-50 border-yellow-400` : tw`bg-gray-50 border-transparent`
                                    ]}
                                >
                                    <View style={tw`w-12 h-12 rounded-2xl bg-white items-center justify-center shadow-sm`}>
                                        <Text style={tw`text-2xl`}>{t.icon}</Text>
                                    </View>
                                    <View style={tw`flex-1`}>
                                        <Text style={tw`text-lg font-black text-gray-900`}>{t.label}</Text>
                                        <Text style={tw`text-[10px] text-gray-400 font-bold leading-tight mt-0.5`}>{t.desc}</Text>
                                    </View>
                                    {kitchenType === t.id && <CheckCircle2 size={20} color="#ca8a04" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {step === 2 && (
                    <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={tw`w-full`}>
                        <View style={tw`mb-8`}>
                            <Text style={tw`text-3xl font-black text-gray-900 tracking-tight`}>Where is your{"\n"}Business?</Text>
                            <Text style={tw`text-gray-400 mt-2 font-bold text-xs uppercase tracking-widest`}>Step 2: Location</Text>
                        </View>

                        <TouchableOpacity
                            onPress={detectLocation}
                            disabled={detecting}
                            style={tw`bg-blue-50 rounded-3xl p-5 flex-row items-center gap-4 mb-8 border border-blue-100`}
                        >
                            <View style={tw`w-12 h-12 bg-blue-100 rounded-2xl items-center justify-center`}>
                                {detecting ? <ActivityIndicator size="small" color="#2563eb" /> : <MapPin size={24} color="#2563eb" />}
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-blue-700 font-black text-sm`}>Auto-detect Location</Text>
                                <Text style={tw`text-blue-600/60 text-[10px] font-bold`}>Fetch address using GPS</Text>
                            </View>
                            {!detecting && <ArrowRight size={16} color="#2563eb" />}
                        </TouchableOpacity>

                        <View style={tw`gap-4`}>
                            <View style={tw`bg-gray-50 rounded-2xl p-4`}>
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Flat / Shop / Building</Text>
                                <TextInput
                                    style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                    placeholder="e.g. Shop 5, Crystal Plaza"
                                    value={building}
                                    onChangeText={setBuilding}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            <View style={tw`bg-gray-50 rounded-2xl p-4`}>
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Locality / Area</Text>
                                <TextInput
                                    style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                    placeholder="e.g. Sector 12, HSR Layout"
                                    value={locality}
                                    onChangeText={setLocality}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            {/* State/City Dropdowns Row */}
                            <View style={tw`flex-row gap-3 mb-4`}>
                                {/* State Dropdown */}
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1`}>State *</Text>
                                    <Pressable
                                        onPress={() => setStateDropdownOpen(!stateDropdownOpen)}
                                        style={tw`bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex-row items-center justify-between`}
                                    >
                                        <Text style={tw`text-base font-bold ${state ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                                            {state || 'Select State'}
                                        </Text>
                                        <View style={tw`flex-row items-center gap-1`}>
                                            {state && (
                                                <Pressable onPress={clearStateFilter} style={tw`p-0.5`}>
                                                    <X size={14} color="#9ca3af" />
                                                </Pressable>
                                            )}
                                            <ChevronDown size={16} color="#9ca3af" />
                                        </View>
                                    </Pressable>

                                    {/* State Dropdown Menu */}
                                    {stateDropdownOpen && (
                                        <View style={tw`absolute top-20 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48`}>
                                            <TextInput
                                                style={tw`px-3 py-2 text-sm font-bold text-gray-900 border-b border-gray-100`}
                                                placeholder="Search states..."
                                                placeholderTextColor="#9ca3af"
                                                value={stateSearchText}
                                                onChangeText={setStateSearchText}
                                                autoFocus
                                            />
                                            <ScrollView style={tw`max-h-40`}>
                                                {filteredStates.map((s) => (
                                                    <Pressable
                                                        key={s}
                                                        onPress={() => handleStateSelect(s)}
                                                        style={tw`px-3 py-2.5 border-b border-gray-50`}
                                                    >
                                                        <Text style={tw`text-sm font-bold text-gray-900`}>{s}</Text>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                {/* City Dropdown */}
                                <View style={tw`flex-1`}>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1`}>City *</Text>
                                    <Pressable
                                        onPress={() => state && setCityDropdownOpen(!cityDropdownOpen)}
                                        disabled={!state}
                                        style={tw`bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex-row items-center justify-between ${!state ? 'opacity-50' : ''}`}
                                    >
                                        <Text style={tw`text-base font-bold ${city ? 'text-gray-900' : 'text-gray-400'}`} numberOfLines={1}>
                                            {city || 'Select City'}
                                        </Text>
                                        <View style={tw`flex-row items-center gap-1`}>
                                            {city && (
                                                <Pressable onPress={clearCityFilter} style={tw`p-0.5`}>
                                                    <X size={14} color="#9ca3af" />
                                                </Pressable>
                                            )}
                                            <ChevronDown size={16} color="#9ca3af" />
                                        </View>
                                    </Pressable>

                                    {/* City Dropdown Menu */}
                                    {cityDropdownOpen && state && (
                                        <View style={tw`absolute top-20 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-48`}>
                                            <TextInput
                                                style={tw`px-3 py-2 text-sm font-bold text-gray-900 border-b border-gray-100`}
                                                placeholder="Search cities..."
                                                placeholderTextColor="#9ca3af"
                                                value={citySearchText}
                                                onChangeText={setCitySearchText}
                                                autoFocus
                                            />
                                            <ScrollView style={tw`max-h-40`}>
                                                {filteredCities.map((c) => (
                                                    <Pressable
                                                        key={c}
                                                        onPress={() => handleCitySelect(c)}
                                                        style={tw`px-3 py-2.5 border-b border-gray-50`}
                                                    >
                                                        <Text style={tw`text-sm font-bold text-gray-900`}>{c}</Text>
                                                    </Pressable>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={tw`flex-row gap-3`}>
                                <View style={[tw`flex-1 bg-gray-50 rounded-2xl p-4 border border-transparent`, autoDetected && tw`border-yellow-400/30`]}>
                                    <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Pincode</Text>
                                    <TextInput
                                        style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                        placeholder="6 Digits"
                                        value={pincode}
                                        onChangeText={setPincode}
                                        placeholderTextColor="#9ca3af"
                                        keyboardType="numeric"
                                        maxLength={6}
                                    />
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {step === 3 && (
                    <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={tw`w-full`}>
                        <View style={tw`mb-8`}>
                            <Text style={tw`text-3xl font-black text-gray-900 tracking-tight`}>Final{"\n"}Checkpoints</Text>
                            <Text style={tw`text-gray-400 mt-2 font-bold text-xs uppercase tracking-widest`}>Step 3: Business Details</Text>
                        </View>

                        <View style={tw`bg-gray-900 rounded-3xl p-6 mb-8`}>
                            <View style={tw`flex-row items-center gap-3 mb-4`}>
                                <View style={tw`w-8 h-8 bg-yellow-400 rounded-lg items-center justify-center`}>
                                    <Phone size={16} color="black" />
                                </View>
                                <Text style={tw`text-white font-black text-xs uppercase tracking-widest`}>Contact Details</Text>
                            </View>

                            <Text style={tw`text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 ml-1`}>Primary WhatsApp Number</Text>
                            <TextInput
                                style={tw`w-full text-xl font-bold text-white py-1`}
                                placeholder="9876543210"
                                value={phone}
                                onChangeText={(v) => {
                                    setPhone(v);
                                    setWhatsapp(v);
                                }}
                                placeholderTextColor="#4b5563"
                                keyboardType="phone-pad"
                                autoFocus
                            />
                        </View>

                        <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1`}>Service Availability</Text>
                        <View style={tw`flex-row gap-4 mb-10`}>
                            {serviceModes.map((m) => (
                                <TouchableOpacity
                                    key={m.id}
                                    onPress={() => setServiceMode(m.id)}
                                    style={[
                                        tw`flex-1 p-5 rounded-3xl items-center border-2`,
                                        serviceMode === m.id ? tw`bg-gray-900 border-gray-900` : tw`bg-gray-50 border-transparent`
                                    ]}
                                >
                                    <Text style={tw`text-3xl mb-3`}>{m.icon}</Text>
                                    <Text style={[tw`font-black text-[10px] uppercase text-center`, { color: serviceMode === m.id ? 'white' : '#111827' }]}>{m.label}</Text>
                                    <Text style={[tw`text-[8px] font-bold text-center mt-1`, { color: serviceMode === m.id ? 'rgba(255,255,255,0.5)' : '#9ca3af' }]}>{m.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={tw`bg-yellow-50 rounded-2xl p-4 mb-8 flex-row items-start gap-3`}>
                            <Info size={16} color="#ca8a04" style={tw`mt-0.5`} />
                            <Text style={tw`flex-1 text-[10px] text-yellow-800 font-bold leading-tight`}>
                                By launching, you agree to our terms. You can adjust your meal timings and menu later in settings.
                            </Text>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Footer Action */}
            <View style={tw`px-6 pb-8 pt-4 border-t border-gray-50 bg-white`}>
                <TouchableOpacity
                    onPress={step === 3 ? handleCreate : nextStep}
                    disabled={loading}
                    style={tw`w-full bg-[#FACC15] rounded-3xl py-4.5 shadow-lg items-center flex-row justify-center gap-3`}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="black" />
                    ) : (
                        <>
                            <Text style={tw`text-black font-black text-sm uppercase tracking-widest`}>
                                {step === 3 ? "Launch Culinary Empire" : "Continue"}
                            </Text>
                            <ArrowRight size={18} color="black" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};
