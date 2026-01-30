import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { loginWithPhone, verifyOTP } from '../services/authService';
import tw from 'twrnc';
import { Phone, ArrowRight, Lock, ChevronLeft } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft, Layout } from 'react-native-reanimated';
import FirebaseRecaptchaModal from '../components/FirebaseRecaptchaModal';
import { auth } from '../config/firebase';

const { width } = Dimensions.get('window');

export const LoginScreen = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verificationId, setVerificationId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const recaptchaVerifier = useRef(null);

    // Step: 'phone' | 'otp'
    const [step, setStep] = useState('phone');

    const handleSendOTP = async () => {
        setError('');
        if (!phoneNumber || phoneNumber.length !== 10) {
            setError("Please enter a valid 10-digit phone number");
            return;
        }
        setLoading(true);
        const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

        const result = await loginWithPhone(formattedNumber, recaptchaVerifier.current);
        setLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            setVerificationId(result.confirmationResult);
            setStep('otp');
        }
    };

    const handleVerifyOTP = async () => {
        setError('');
        if (!verificationCode || verificationCode.length < 6) {
            setError("Please enter a valid 6-digit OTP");
            return;
        }
        setLoading(true);
        const result = await verifyOTP(verificationId, verificationCode);
        setLoading(false);
        if (result.error) setError(result.error);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={tw`flex-1 bg-white items-center justify-center px-6 pt-12 pb-6`}
        >
            <View style={tw`w-full max-w-[85%]`}>
                {/* Compact Header */}
                <Animated.View layout={Layout.springify()} style={tw`items-center mb-10`}>
                    <View style={[tw`w-14 h-14 bg-yellow-100 rounded-2xl items-center justify-center mb-3`, { transform: [{ rotate: '3deg' }] }]}>
                        <Text style={tw`text-2xl`}>🍱</Text>
                    </View>
                    <Text style={tw`text-2xl font-black text-gray-900 tracking-tight text-center`}>
                        {step === 'phone' ? 'Welcome' : 'Verify Code'}
                    </Text>
                    <Text style={tw`text-xs text-gray-400 mt-1 font-bold text-center uppercase tracking-wide`}>
                        {step === 'phone' ? 'Login with your phone' : `Sent to ${phoneNumber}`}
                    </Text>
                </Animated.View>

                {step === 'phone' ? (
                    <Animated.View entering={FadeIn} exiting={FadeOut} style={tw`w-full`}>
                        <View style={tw`bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 flex-row items-center focus:border-yellow-400`}>
                            <Phone size={16} color="#9ca3af" style={tw`mr-3 ml-1`} />
                            <Text style={tw`text-sm font-bold text-gray-500 mr-2`}>+91</Text>
                            <TextInput
                                style={tw`flex-1 text-lg font-bold text-gray-900 h-full py-1`}
                                placeholder="XXXXX XXXXX"
                                keyboardType="phone-pad"
                                value={phoneNumber}
                                onChangeText={setPhoneNumber}
                                autoFocus
                                selectionColor="#ca8a04"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        {error && (
                            <View style={tw`mb-3`}>
                                <Text style={tw`text-red-500 text-xs font-bold text-center`}>{error}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={tw`w-full bg-yellow-400 rounded-2xl py-4 shadow-sm items-center flex-row justify-center gap-2`}
                            onPress={handleSendOTP}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator size="small" color="black" /> : (
                                <>
                                    <Text style={tw`text-black font-black text-xs uppercase tracking-widest`}>Get OTP</Text>
                                    <ArrowRight size={16} color="black" />
                                </>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    <Animated.View entering={SlideInRight} exiting={SlideOutLeft} style={tw`w-full`}>
                        <View style={tw`bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 flex-row items-center justify-center focus:border-yellow-400`}>
                            <Lock size={16} color="#9ca3af" style={tw`absolute left-4`} />
                            <TextInput
                                style={tw`text-xl font-black text-gray-900 h-full tracking-[10px] text-center w-full py-1`} // W-full to center text properly
                                placeholder="------"
                                keyboardType="number-pad"
                                maxLength={6}
                                value={verificationCode}
                                onChangeText={setVerificationCode}
                                autoFocus
                                selectionColor="#ca8a04"
                                placeholderTextColor="#9ca3af"
                            />
                        </View>

                        {error && (
                            <View style={tw`mb-3`}>
                                <Text style={tw`text-red-500 text-xs font-bold text-center`}>{error}</Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={tw`w-full bg-yellow-400 rounded-2xl py-4 shadow-sm items-center flex-row justify-center gap-2`}
                            onPress={handleVerifyOTP}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator size="small" color="black" /> : (
                                <>
                                    <Text style={tw`text-black font-black text-xs uppercase tracking-widest`}>Verify & Login</Text>
                                    <ArrowRight size={16} color="black" />
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => { setStep('phone'); setError(''); }} style={tw`mt-4 self-center flex-row items-center gap-1 p-2`}>
                            <ChevronLeft size={12} color="#9ca3af" />
                            <Text style={tw`text-gray-400 font-bold text-[10px] uppercase tracking-widest`}>Change Number</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
            <FirebaseRecaptchaModal
                ref={recaptchaVerifier}
                firebaseConfig={auth.app.options}
                attemptInvisibleVerification={true}
            />
        </KeyboardAvoidingView>
    );
};
