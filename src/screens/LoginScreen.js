import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { loginUser, registerUser } from '../services/authService';
import tw from 'twrnc';

export const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter valid credentials");
            return;
        }

        setLoading(true);
        let result;

        if (isRegistering) {
            result = await registerUser(email, password);
        } else {
            result = await loginUser(email, password);
        }

        setLoading(false);

        if (result.error) {
            Alert.alert("Authentication Failed", result.error);
        }
    };

    return (
        <View style={tw`flex-1 bg-white items-center justify-center p-4`}>
            <Text style={tw`text-3xl font-extrabold text-yellow-500 mb-8 tracking-widest`}>
                TIFFIN CRM
            </Text>

            <View style={tw`w-full max-w-sm`}>
                <Text style={tw`text-gray-600 mb-2 font-medium`}>Email Address</Text>
                <TextInput
                    style={tw`w-full border border-gray-300 rounded-lg p-3 mb-4 text-lg bg-gray-50 focus:border-yellow-400`}
                    placeholder="hello@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />

                <Text style={tw`text-gray-600 mb-2 font-medium`}>Password</Text>
                <TextInput
                    style={tw`w-full border border-gray-300 rounded-lg p-3 mb-6 text-lg bg-gray-50 focus:border-yellow-400`}
                    placeholder="******"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity
                    style={[
                        tw`w-full bg-yellow-400 rounded-lg p-4 items-center shadow-sm`,
                        loading ? tw`opacity-70` : null
                    ]}
                    onPress={handleAuth}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <Text style={tw`text-black font-bold text-lg`}>
                            {isRegistering ? "Create Account" : "Login"}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={tw`mt-6 items-center`}
                    onPress={() => setIsRegistering(!isRegistering)}
                >
                    <Text style={tw`text-gray-500 text-base`}>
                        {isRegistering ? "Already have an account? Login" : "New to Tiffin CRM? Sign Up"}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
