import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Image, Alert, ActivityIndicator, Linking } from 'react-native';
import { useAuth } from "../../contexts/AuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { requestPayment, uploadImage } from "../../services/paymentService";
import tw from 'twrnc';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Smartphone, CreditCard, Upload } from 'lucide-react-native';
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
      <View style={tw`flex-row items-center gap-2 mb-6`}>
        <Pressable onPress={() => navigation.goBack()} style={tw`p-2`}>
          <ArrowLeft size={24} color="#1f2937" />
        </Pressable>
        <View>
          <Text style={tw`text-2xl font-bold text-gray-900`}>Add Money</Text>
          <Text style={tw`text-gray-500 text-xs`}>Pay via UPI or Cash</Text>
        </View>
      </View>

      {/* Payment Mode */}
      <View style={tw`bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6`}>
        <Text style={tw`text-xs font-bold text-gray-400 uppercase tracking-widest mb-3`}>Payment Method</Text>
        <View style={tw`flex-row gap-3`}>
          {["UPI", "CASH"].map(mode => (
            <Pressable
              key={mode}
              onPress={() => setPaymentMode(mode)}
              style={[
                tw`flex-1 py-3 rounded-2xl border items-center justify-center`,
                paymentMode === mode
                  ? tw`bg-yellow-400 border-yellow-400`
                  : tw`bg-white border-gray-200`
              ]}
            >
              <Text style={tw`font-bold text-sm text-gray-900`}>{mode}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* UPI QR & Details */}
      {paymentMode === "UPI" && (
        <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6 items-center`}>
          <View style={tw`flex-row items-center gap-2 mb-4`}>
            <CreditCard size={18} color="#4b5563" />
            <Text style={tw`text-sm font-medium text-gray-600`}>Scan to Pay</Text>
          </View>

          <View style={tw`w-48 h-48 bg-white p-2 rounded-xl border border-gray-100 mb-4`}>
            <Image
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${UPI_ID}` }}
              style={tw`w-full h-full`}
            />
          </View>

          <Text style={tw`text-xs text-gray-400`}>UPI ID: <Text style={tw`text-gray-900 font-bold`}>{UPI_ID}</Text></Text>
        </View>
      )}

      {/* Amount Input */}
      <View style={tw`bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-6`}>
        <Text style={tw`text-xs font-bold text-gray-400 uppercase tracking-widest mb-2`}>Amount</Text>
        <View style={tw`flex-row items-center border-b border-gray-200 pb-2`}>
          <Text style={tw`text-3xl font-black text-gray-300 mr-2`}>₹</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="Enter amount"
            style={tw`flex-1 text-3xl font-black text-gray-900`}
          />
        </View>
      </View>

      {/* Mobile UPI Button */}
      {paymentMode === "UPI" && isAmountValid && (
        <Pressable onPress={handleUPIPay} style={tw`bg-gray-100 py-4 rounded-2xl items-center justify-center flex-row gap-2 mb-6`}>
          <Smartphone size={20} color="#1f2937" />
          <Text style={tw`font-bold text-gray-900`}>Open UPI App</Text>
        </Pressable>
      )}

      {/* Upload Screenshot */}
      {paymentMode === "UPI" && (
        <Pressable onPress={pickImage} style={tw`bg-white rounded-3xl p-6 shadow-sm border border-gray-200 border-dashed mb-6 items-center`}>
          <Upload size={24} color="#9ca3af" style={tw`mb-2`} />
          <Text style={tw`text-sm font-bold text-gray-600`}>
            {imageUri ? "Screenshot Selected" : "Tap to Upload Screenshot"}
          </Text>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={tw`w-32 h-32 rounded-lg mt-4`} />
          )}
        </Pressable>
      )}

      {/* Submit Button */}
      <Pressable
        onPress={handleSubmit}
        disabled={!isFormValid}
        style={[
          tw`w-full py-4 rounded-2xl items-center justify-center shadow-lg`,
          isFormValid ? tw`bg-yellow-400` : tw`bg-gray-200`
        ]}
      >
        {loading ? <ActivityIndicator color="#000" /> : (
          <Text style={[tw`font-black text-lg`, isFormValid ? tw`text-black` : tw`text-gray-400`]}>
            Submit Payment
          </Text>
        )}
      </Pressable>

    </ScrollView>
  );
};
