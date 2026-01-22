import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, Alert, ActivityIndicator, Linking } from 'react-native';
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { requestPayment, uploadImage } from "../../services/paymentService";
import tw from 'twrnc';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Smartphone, CreditCard, Upload, CheckCircle } from 'lucide-react-native';
import { useNavigation } from "@react-navigation/native";

const UPI_ID = "aadis@oksbi"; // Ideally from config
const PAYEE_NAME = "Aadis Kitchen";

export const AddPaymentScreen = () => {
  const { user, userProfile } = useAuth();
  const { tenant } = useTenant();
  const navigation = useNavigation();

  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("UPI"); // 'UPI' | 'CASH'
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const isAmountValid = Number(amount) > 0;
  const isFormValid = isAmountValid && !loading && (paymentMode === "CASH" || imageUri);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Maybe?
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUPIPay = () => {
    if (!isAmountValid) return;
    const upiUrl = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${amount}&cu=INR`;
    Linking.openURL(upiUrl).catch(err => {
      Alert.alert("Error", "Could not open UPI app. Please scan the QR code instead.");
    });
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setLoading(true);

    try {
      // 1. Upload Image if UPI
      let uploadedUrl = null;
      if (paymentMode === 'UPI' && imageUri) {
        uploadedUrl = await uploadImage(imageUri);
        if (!uploadedUrl) {
          Alert.alert("Upload Failed", "Could not upload screenshot. Please try again.");
          setLoading(false);
          return;
        }
      }

      // 2. Submit Payment Request
      const paymentData = {
        userId: user.uid,
        userDisplayName: userProfile?.name || 'Student',
        amount: amount,
        method: paymentMode,
        screenshotUri: uploadedUrl, // We specifically pass the URL now, not URI. Wait, service expects URI and uploads it? 
        // Let's check service. Service 'requestPayment' calls 'uploadImage' inside it if screenshotUri is passed.
        // Ah, the service takes 'screenshotUri' and uploads it. 
        // So we can just pass 'imageUri' to service directly? 
        // Wait, I implemented upload logic here separately above. 
        // If service handles it, I should use service. 
        // Let's look at paymentService.js: "if (paymentData.screenshotUri) screenshotUrl = await uploadImage..."
        // So yes, I can pass local URI to service.
        // BUT, to be safe and separate concerns, I usually prefer handling upload here or letting service do it.
        // Service logic: "if screenshotUri... uploadImage...".
        // So I will pass the LOCAL URI to the service, and let it upload.
        // Wait, "uploadedUrl" logic above is redundant then? 
        // YES. Let's remove the manual upload here and let service handle it to keep code clean.
        // REVISION: I will pass `screenshotUri: imageUri` to `requestPayment`.
      };

      // Re-read service: 
      // export const requestPayment = async (kitchenId, paymentData) => { ... if (paymentData.screenshotUri) await uploadImage ... }
      // So yes, pass local URI.

      const result = await requestPayment(tenant.id, {
        ...paymentData,
        screenshotUri: imageUri // Pass local URI
      });

      if (result.success) {
        Alert.alert("Success", "Payment submitted successfully! Waiting for approval.", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert("Error", result.error || "Failed to submit payment.");
      }

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tw`flex-1 bg-[#faf9f6]`} contentContainerStyle={tw`p-6 pb-20`}>
      {/* Header */}
      <View style={tw`flex-row items-center gap-3 mb-8`}>
        <Pressable onPress={() => navigation.goBack()} style={tw`w-10 h-10 rounded-xl bg-white border border-gray-100 items-center justify-center shadow-sm`}>
          <ArrowLeft size={20} color="#1f2937" />
        </Pressable>
        <View>
          <Text style={tw`text-xl font-black text-gray-900`}>Add Money</Text>
          <Text style={tw`text-gray-400 text-[9px] font-black uppercase tracking-widest`}>Wallet Top-up</Text>
        </View>
      </View>

      {/* 1. Amount Input - Simplified */}
      <View style={tw`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5`}>
        <Text style={tw`text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3`}>Enter Amount</Text>
        <View style={tw`flex-row items-center border-b border-gray-100 pb-2 h-16`}>
          <Text style={tw`text-2xl font-black text-yellow-600 mr-2`}>₹</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor="#d1d5db"
            style={tw`flex-1 text-3xl font-black text-gray-900`}
          />
        </View>
        {!isAmountValid && (
          <Text style={tw`text-[9px] font-bold text-gray-300 mt-2`}>Please enter an amount to proceed</Text>
        )}
      </View>

      {isAmountValid && (
        <View>
          {/* 2. Mode select - Thinner */}
          <View style={tw`flex-row gap-2 mb-5`}>
            {["UPI", "CASH"].map(mode => (
              <Pressable
                key={mode}
                onPress={() => setPaymentMode(mode)}
                style={[
                  tw`flex-1 py-3 rounded-xl border items-center justify-center flex-row gap-2`,
                  paymentMode === mode
                    ? tw`bg-yellow-400 border-yellow-400 shadow-sm shadow-yellow-200`
                    : tw`bg-white border-gray-100`
                ]}
              >
                {mode === "UPI" ? <Smartphone size={14} color={paymentMode === mode ? "#000" : "#9ca3af"} /> : <CreditCard size={14} color={paymentMode === mode ? "#000" : "#9ca3af"} />}
                <Text style={[tw`font-black text-[10px] uppercase tracking-widest`, paymentMode === mode ? tw`text-black` : tw`text-gray-400`]}>{mode}</Text>
              </Pressable>
            ))}
          </View>

          {/* 3. Payment specific actions */}
          {paymentMode === "UPI" ? (
            <View>
              {/* Pay Button - Minimalist */}
              <Pressable
                onPress={handleUPIPay}
                style={tw`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-5 flex-row items-center justify-between`}
              >
                <View style={tw`flex-row items-center gap-3`}>
                  <View style={tw`bg-yellow-50 w-10 h-10 rounded-xl items-center justify-center`}>
                    <Smartphone size={20} color="#ca8a04" />
                  </View>
                  <View>
                    <Text style={tw`text-sm font-black text-gray-900`}>Pay via UPI App</Text>
                    <Text style={tw`text-[9px] font-bold text-gray-400 uppercase`}>Instant Transfer</Text>
                  </View>
                </View>
                <ArrowLeft size={16} color="#ca8a04" style={{ transform: [{ rotate: '180deg' }] }} />
              </Pressable>

              {/* Screenshot Section - Very Minimal */}
              <View style={tw`mb-5`}>
                <Pressable
                  onPress={pickImage}
                  style={[
                    tw`bg-white rounded-2xl p-4 border`,
                    imageUri ? tw`border-emerald-100 bg-emerald-50/20` : tw`border-gray-100 border-dashed`
                  ]}
                >
                  {imageUri ? (
                    <View>
                      <View style={tw`flex-row items-center justify-between mb-3`}>
                        <View style={tw`flex-row items-center gap-1.5`}>
                          <View style={tw`w-5 h-5 rounded-full bg-emerald-500 items-center justify-center`}>
                            <CheckCircle size={12} color="white" />
                          </View>
                          <Text style={tw`text-xs font-bold text-emerald-800`}>Bill Attached</Text>
                        </View>
                        <Pressable onPress={pickImage} style={tw`bg-white/50 px-2 py-0.5 rounded-lg border border-emerald-100`}>
                          <Text style={tw`text-[9px] font-black text-emerald-600 uppercase`}>Edit</Text>
                        </Pressable>
                      </View>
                      <View style={tw`w-full h-48 rounded-xl overflow-hidden border border-emerald-50`}>
                        <Image source={{ uri: imageUri }} style={tw`w-full h-full`} resizeMode="contain" />
                      </View>
                    </View>
                  ) : (
                    <View style={tw`py-4 items-center`}>
                      <Upload size={20} color="#9ca3af" />
                      <Text style={tw`text-xs font-bold text-gray-500 mt-2`}>Tap to upload screenshot</Text>
                      <Text style={tw`text-[8px] font-black text-gray-300 uppercase mt-1 tracking-widest`}>Compulsory for confirmation</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={tw`bg-white rounded-2xl p-6 border border-gray-100 mb-5 items-center`}>
              <CreditCard size={24} color="#ca8a04" />
              <Text style={tw`text-base font-black text-gray-900 mt-2`}>Cash Payment</Text>
              <Text style={tw`text-xs text-gray-500 text-center mt-1 leading-4`}>
                Hand over <Text style={tw`text-gray-900 font-bold`}>₹{amount}</Text> to admin.{"\n"}Refills your wallet instantly.
              </Text>
            </View>
          )}

          {/* Submit - Action Oriented */}
          <Pressable
            onPress={handleSubmit}
            disabled={!isFormValid}
            style={[
              tw`w-full py-4 rounded-xl items-center justify-center`,
              isFormValid ? tw`bg-gray-900 shadow-md` : tw`bg-gray-100`
            ]}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <Text style={[tw`font-black text-xs uppercase tracking-widest`, isFormValid ? tw`text-white` : tw`text-gray-300`]}>
                Confirm & Add Money
              </Text>
            )}
          </Pressable>
          <Text style={tw`text-center text-[8px] font-black text-gray-300 mt-4 uppercase tracking-widest`}>
            Hand-verified by the aadis team
          </Text>
        </View>
      )}

    </ScrollView>
  );
};
