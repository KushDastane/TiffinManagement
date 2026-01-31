import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, BackHandler, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { createUserProfile, updateUserProfile } from '../services/authService';
import { normalizeLocation } from '../utils/locationNormalizer';
import tw from 'twrnc';
import { User, ArrowRight, ChevronLeft, MapPin, Navigation, Info } from 'lucide-react-native';
import Animated, { FadeIn, SlideInRight, SlideOutLeft, Layout } from 'react-native-reanimated';

export const StudentSetupScreen = ({ route, navigation }) => {
    const { user, userProfile } = useAuth();
    const editMode = route?.params?.editMode || false;
    const [step, setStep] = useState(editMode ? 2 : 1);
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [pincode, setPincode] = useState('');
    const [area, setArea] = useState('');
    const [loading, setLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);
    const [autoDetected, setAutoDetected] = useState(false);
    const [resetting, setResetting] = useState(false);

    // Pre-fill location data in edit mode
    useEffect(() => {
        if (editMode && userProfile) {
            setCity(userProfile.cityDisplay || userProfile.city || '');
            setPincode(userProfile.pincode || '');
            setArea(userProfile.area || '');
            setName(userProfile.name || '');
        }
    }, [editMode, userProfile]);

    const handleBack = async () => {
        if (step > 1) {
            // Allow going back to previous step
            setStep(step - 1);
            return;
        }

        // At step 1 - always reset role to go to role selection
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
    }, [step]);

    const nextStep = () => {
        if (step === 1) {
            if (!name.trim()) return Alert.alert("Required", "Please enter your full name.");
            setStep(2);
        }
    };

    const detectLocation = async () => {
        try {
            setDetecting(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Permission Denied", "Please allow location access.");
                setDetecting(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced
            });

            const { latitude, longitude } = location.coords;
            const expoReverse = await Location.reverseGeocodeAsync({ latitude, longitude });

            let detectedCity = '';
            let detectedPin = '';
            let detectedArea = '';

            if (expoReverse?.length) {
                const expoAddr = expoReverse[0];
                detectedCity = expoAddr.city || expoAddr.subregion || '';
                detectedPin = expoAddr.postalCode || '';
                detectedArea = expoAddr.district || expoAddr.street || '';
            }

            setCity(detectedCity);
            setArea(detectedArea);
            setPincode(detectedPin);
            setAutoDetected(true);

            if (!detectedPin) {
                Alert.alert("Partial Detection", "We found your city, but please enter your exact pincode.");
            } else {
                Alert.alert("Location Found", "Please verify if the pincode is correct.");
            }
        } catch (err) {
            console.error("Location error:", err);
            Alert.alert("Error", "Could not detect location.");
        } finally {
            setDetecting(false);
        }
    };

    const handleFinalSave = async () => {
        if (!city.trim() || !pincode.trim()) {
            return Alert.alert("Required", "City and Pincode are required to find kitchens near you.");
        }
        if (pincode.length !== 6) {
            return Alert.alert("Invalid Pincode", "Please enter a valid 6-digit Pincode.");
        }

        setLoading(true);

        const updateData = {
            city: normalizeLocation(city),
            cityDisplay: city.trim(),
            pincode: pincode.trim(),
            area: area.trim(),
            locationSet: true
        };

        // Only update name if not in edit mode
        if (!editMode) {
            updateData.name = name.trim();
            updateData.phoneNumber = user.phoneNumber;
        }

        const result = await updateUserProfile(user.uid, updateData);

        if (result.error) {
            Alert.alert("Error", result.error);
        } else if (editMode) {
            // In edit mode, navigate back to Discovery
            navigation.goBack();
        }
        setLoading(false);
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

                <View style={tw`flex-1 px-12`}>
                    <View style={tw`h-1 w-full bg-gray-100 rounded-full overflow-hidden`}>
                        <Animated.View
                            layout={Layout.springify()}
                            style={[tw`h-full bg-yellow-400`, { width: `${(step / 2) * 100}%` }]}
                        />
                    </View>
                </View>

                <View style={tw`w-10 items-center`}>
                    <Text style={tw`text-[10px] font-black text-gray-400`}>{step}/2</Text>
                </View>
            </View>

            <ScrollView
                style={tw`flex-1`}
                contentContainerStyle={tw`px-6 pt-10 pb-10 items-center`}
                showsVerticalScrollIndicator={false}
            >
                {step === 1 && (
                    <Animated.View entering={FadeIn} exiting={SlideOutLeft} style={tw`w-full items-center`}>
                        <View style={tw`w-16 h-16 bg-yellow-50 rounded-3xl items-center justify-center mb-6`}>
                            <User size={32} color="#ca8a04" />
                        </View>
                        <Text style={tw`text-3xl font-black text-gray-900 text-center tracking-tight`}>Welcome!{"\n"}What's your name?</Text>
                        <Text style={tw`text-gray-400 mt-2 font-bold text-xs uppercase tracking-widest text-center`}>Step 1: Introduction</Text>

                        <View style={tw`w-full mt-10 bg-gray-50 rounded-3xl p-6 border border-gray-100`}>
                            <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1`}>Full Name</Text>
                            <TextInput
                                style={tw`w-full text-xl font-bold text-gray-900 py-1`}
                                placeholder="e.g. Kush Dastane"
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                                autoFocus
                                selectionColor="#ca8a04"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        <View style={tw`mt-8 bg-blue-50/50 p-4 rounded-2xl flex-row items-start gap-3 w-full border border-blue-100/30`}>
                            <Info size={16} color="#2563eb" style={tw`mt-0.5`} />
                            <Text style={tw`flex-1 text-[10px] font-bold text-blue-700 leading-tight`}>
                                We'll use this name for your orders and to personalize your experience.
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {step === 2 && (
                    <Animated.View entering={SlideInRight} style={tw`w-full items-center`}>
                        <View style={tw`w-16 h-16 bg-blue-50 rounded-3xl items-center justify-center mb-6`}>
                            <MapPin size={32} color="#2563eb" />
                        </View>
                        <Text style={tw`text-3xl font-black text-gray-900 text-center tracking-tight`}>Where are you{"\n"}staying?</Text>
                        <Text style={tw`text-gray-400 mt-2 font-bold text-xs uppercase tracking-widest text-center`}>Step 2: Location</Text>

                        <TouchableOpacity
                            onPress={detectLocation}
                            disabled={detecting}
                            style={tw`w-full mt-8 bg-blue-50 rounded-3xl p-5 flex-row items-center gap-4 border border-blue-100`}
                        >
                            <View style={tw`w-12 h-12 bg-blue-100 rounded-2xl items-center justify-center`}>
                                {detecting ? <ActivityIndicator size="small" color="#2563eb" /> : <Navigation size={24} color="#2563eb" />}
                            </View>
                            <View style={tw`flex-1`}>
                                <Text style={tw`text-blue-700 font-black text-sm`}>Auto-detect Location</Text>
                                <Text style={tw`text-blue-600/60 text-[10px] font-bold`}>Find kitchens near you</Text>
                            </View>
                            {!detecting && <ArrowRight size={16} color="#2563eb" />}
                        </TouchableOpacity>

                        <View style={tw`w-full gap-4 mt-6`}>
                            <View style={tw`bg-gray-50 rounded-2xl p-4`}>
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>City</Text>
                                <TextInput
                                    style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                    placeholder="e.g. Mumbai"
                                    value={city}
                                    onChangeText={setCity}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            <View style={tw`bg-gray-50 rounded-2xl p-4`}>
                                <Text style={tw`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1`}>Locality / Area</Text>
                                <TextInput
                                    style={tw`w-full text-base font-bold text-gray-900 py-1`}
                                    placeholder="e.g. HSR Layout"
                                    value={area}
                                    onChangeText={setArea}
                                    placeholderTextColor="#9ca3af"
                                />
                            </View>

                            <View style={tw`bg-gray-50 rounded-2xl p-4 border border-transparent ${autoDetected ? 'border-yellow-400/30' : ''}`}>
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
                    </Animated.View>
                )}
            </ScrollView>

            {/* Footer Action */}
            <View style={tw`px-6 pb-8 pt-4 bg-white`}>
                <TouchableOpacity
                    onPress={step === 2 ? handleFinalSave : nextStep}
                    disabled={loading || detecting}
                    style={tw`w-full bg-[#FACC15] rounded-3xl py-4.5 shadow-lg items-center flex-row justify-center gap-3`}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="black" />
                    ) : (
                        <>
                            <Text style={tw`text-black font-black text-sm uppercase tracking-widest`}>
                                {step === 2 ? "Find Kitchens" : "Continue"}
                            </Text>
                            <ArrowRight size={18} color="black" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};
