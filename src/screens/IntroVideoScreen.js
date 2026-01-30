
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, BackHandler, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { Video, ResizeMode, Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, Volume2, VolumeX, ChevronLeft, Rewind, FastForward } from 'lucide-react-native';
import tw from 'twrnc';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/authService';
import { VIDEO_CONFIG } from '../config/videoConfig';

const { width, height } = Dimensions.get('window');

export const IntroVideoScreen = ({ route, navigation, onFinish, role: propRole }) => {
    const { user } = useAuth();
    // Role passed from parent (RootNavigator) usually via props
    // Check props first, then route params
    const role = propRole || route.params?.role;
    const videoRef = useRef(null);
    const [status, setStatus] = useState({});
    const [showSkip, setShowSkip] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);
    const [resetting, setResetting] = useState(false);
    const [countDown, setCountDown] = useState(VIDEO_CONFIG.SKIP_DURATION_MS / 1000);
    const [lastTap, setLastTap] = useState({ time: 0, side: null });
    const [showControls, setShowControls] = useState(true);
    const controlsTimerRef = useRef(null);

    // Auto-hide controls after 3 seconds
    const resetControlsTimer = () => {
        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        setShowControls(true);
        controlsTimerRef.current = setTimeout(() => {
            if (status.isPlaying) {
                setShowControls(false);
            }
        }, 3000);
    };

    useEffect(() => {
        if (status.isPlaying && showControls) {
            resetControlsTimer();
        }
        return () => {
            if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
        };
    }, [status.isPlaying]);

    // Determine config based on role
    const configKey = role === 'admin' ? 'admin' : 'student';
    const videoSource = VIDEO_CONFIG[configKey] || VIDEO_CONFIG.student;
    const storageKey = role === 'admin' ? VIDEO_CONFIG.STORAGE_KEYS.HAS_WATCHED_INTRO_ADMIN : VIDEO_CONFIG.STORAGE_KEYS.HAS_WATCHED_INTRO_STUDENT;

    useEffect(() => {
        if (!videoLoaded || !status.isPlaying) return;
        const interval = setInterval(() => {
            setCountDown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setShowSkip(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [videoLoaded, status.isPlaying]);

    // Handle Hardware Back Press
    useEffect(() => {
        const backAction = () => {
            // Reset role to null to go back to Role Selection
            if (user?.uid) {
                updateUserProfile(user.uid, { role: null });
            }
            return true;
        };

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            backAction
        );

        return () => backHandler.remove();
    }, [navigation, user]);

    const handleFinish = async () => {
        try {
            await AsyncStorage.setItem(storageKey, 'true');
            if (onFinish) {
                onFinish();
            } else {
                navigation.replace(role === 'admin' ? 'CreateKitchen' : 'Setup');
            }
        } catch (error) {
            console.error("Failed to save video state", error);
            if (onFinish) onFinish();
        }
    };

    useEffect(() => {
        // Essential for iOS/Android audio behavior
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: false,
            interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
            playThroughEarpieceAndroid: false,
        });
    }, []);

    const togglePlayPause = () => {
        if (status.didJustFinish) {
            videoRef.current.replayAsync();
            return;
        }
        if (status.isPlaying) {
            videoRef.current.pauseAsync();
        } else {
            videoRef.current.playAsync();
        }
    };

    const toggleMute = async () => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        if (videoRef.current) {
            await videoRef.current.setIsMutedAsync(newMuted);
        }
    };

    const handleReplay = () => {
        videoRef.current.replayAsync();
    };

    const onSeek = (value) => {
        setSeekValue(value);
    };

    const onSlidingStart = () => {
        setIsSeeking(true);
    };

    const onSlidingComplete = async (value) => {
        if (videoRef.current) {
            await videoRef.current.setPositionAsync(value);
            // Optionally ensure it plays if it was paused
            if (!status.isPlaying) videoRef.current.playAsync();
        }
        setIsSeeking(false);
    };

    const handleSeekRelative = async (seconds) => {
        if (videoRef.current && status.positionMillis !== undefined) {
            const newPosition = Math.max(0, Math.min(status.durationMillis || 0, status.positionMillis + (seconds * 1000)));
            await videoRef.current.setPositionAsync(newPosition);
            if (!status.isPlaying && !status.didJustFinish) videoRef.current.playAsync();
        }
    };

    // Update slider value when video plays, only if NOT seeking
    useEffect(() => {
        if (!isSeeking && status.positionMillis !== undefined) {
            setSeekValue(status.positionMillis);
        }
    }, [status.positionMillis, isSeeking]);


    return (
        <SafeAreaView style={tw`flex-1 bg-white`}>
            <TouchableWithoutFeedback onPress={() => setShowControls(false)}>
                <View style={tw`flex-1`}>

                    {/* Back Button */}
                    <TouchableOpacity
                        onPress={() => {
                            if (user?.uid) {
                                setResetting(true);
                                updateUserProfile(user.uid, { role: null });
                            }
                        }}
                        style={tw`absolute top-5 left-3 p-2 bg-gray-50 rounded-full z-50`}
                        disabled={resetting}
                    >
                        {resetting
                            ? <ActivityIndicator size="small" color="#9ca3af" />
                            : <ChevronLeft size={20} color="#374151" />
                        }
                    </TouchableOpacity>

                    <KeyboardAvoidingView style={tw`flex-1 items-center justify-center px-6 pt-12 pb-6`} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

                        <View style={tw`w-full items-center mb-6 relative`}>
                            <Text style={tw`text-2xl font-black text-gray-900 tracking-tight text-center mb-1`}>
                                Welcome to DabbaMe!
                            </Text>
                            <Text style={tw`text-gray-500 font-medium text-center text-xs w-[60%]`}>
                                Quick tour for you as a {role === 'admin' ? 'Kitchen Manager' : 'Student'}.
                            </Text>
                        </View>

                        {/* Video Card */}
                        <View style={[tw`bg-black rounded-3xl shadow-xl overflow-hidden mb-6 relative border-4 border-gray-100`, { width: '85%', aspectRatio: 9 / 16 }]}>

                            <Video
                                ref={videoRef}
                                style={StyleSheet.absoluteFill}
                                source={videoSource.uri ? { uri: videoSource.uri } : videoSource}
                                useNativeControls={false}
                                resizeMode={ResizeMode.CONTAIN}
                                isLooping={false}
                                isMuted={isMuted}
                                shouldPlay
                                onPlaybackStatusUpdate={status => {
                                    setStatus(status);
                                    if (status.didJustFinish) setShowSkip(true);
                                }}
                                onLoad={() => setVideoLoaded(true)}
                            />

                            {!videoLoaded && (
                                <View style={[StyleSheet.absoluteFill, tw`items-center justify-center bg-gray-50`]}>
                                    <ActivityIndicator size="large" color="#FACC15" />
                                </View>
                            )}

                            {videoLoaded && (
                                <View style={tw`absolute inset-0`} pointerEvents="box-none">

                                    {/* 1. Background Tap Layer (Lowest) */}
                                    <TouchableOpacity
                                        activeOpacity={1}
                                        onPress={() => {
                                            if (showControls) togglePlayPause();
                                            else resetControlsTimer();
                                        }}
                                        style={tw`absolute inset-0`}
                                    />

                                    {/* 2. Double Tap Seek Zones (Middle Layer) */}
                                    <View style={tw`absolute inset-0 flex-row`} pointerEvents="box-none">
                                        <TouchableOpacity
                                            activeOpacity={1}
                                            style={tw`flex-1 h-full`}
                                            onPress={() => {
                                                const now = Date.now();
                                                if (now - lastTap.time < 300 && lastTap.side === 'left') {
                                                    handleSeekRelative(-10);
                                                    setLastTap({ time: 0, side: null });
                                                    resetControlsTimer();
                                                } else {
                                                    setLastTap({ time: now, side: 'left' });
                                                    if (showControls) togglePlayPause();
                                                    else resetControlsTimer();
                                                }
                                            }}
                                        />
                                        <View style={tw`flex-1 h-full`} pointerEvents="none" />
                                        <TouchableOpacity
                                            activeOpacity={1}
                                            style={tw`flex-1 h-full`}
                                            onPress={() => {
                                                const now = Date.now();
                                                if (now - lastTap.time < 300 && lastTap.side === 'right') {
                                                    handleSeekRelative(10);
                                                    setLastTap({ time: 0, side: null });
                                                    resetControlsTimer();
                                                } else {
                                                    setLastTap({ time: now, side: 'right' });
                                                    if (showControls) togglePlayPause();
                                                    else resetControlsTimer();
                                                }
                                            }}
                                        />
                                    </View>

                                    {/* 3. Interactive HUD layer (Top Layer) */}
                                    <View style={tw`absolute inset-0 justify-between p-3`} pointerEvents="box-none">

                                        {/* Mute Button */}
                                        {showControls && (
                                            <View style={tw`flex-row justify-end`} pointerEvents="box-none">
                                                <TouchableOpacity
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        toggleMute();
                                                        resetControlsTimer();
                                                    }}
                                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                    style={tw`w-10 h-10 bg-black/40 rounded-full items-center justify-center shadow-lg`}
                                                >
                                                    {isMuted ? <VolumeX size={20} color="white" /> : <Volume2 size={20} color="white" />}
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {/* Center HUD */}
                                        {showControls && (
                                            <View style={tw`absolute inset-0 items-center justify-center flex-row gap-6`} pointerEvents="box-none">
                                                <TouchableOpacity
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleSeekRelative(-10);
                                                        resetControlsTimer();
                                                    }}
                                                    style={tw`w-12 h-12 bg-black/30 rounded-full items-center justify-center backdrop-blur-sm shadow-xl active:scale-90`}
                                                >
                                                    <Rewind size={24} color="white" fill="white" />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        togglePlayPause();
                                                        resetControlsTimer();
                                                    }}
                                                    style={tw`w-16 h-16 bg-black/40 rounded-full items-center justify-center backdrop-blur-md shadow-2xl active:scale-95`}
                                                >
                                                    {status.didJustFinish ? (
                                                        <RotateCcw size={32} color="white" />
                                                    ) : (
                                                        status.isPlaying ? <Pause size={32} color="white" fill="white" /> : <Play size={32} color="white" fill="white" />
                                                    )}
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        handleSeekRelative(10);
                                                        resetControlsTimer();
                                                    }}
                                                    style={tw`w-12 h-12 bg-black/30 rounded-full items-center justify-center backdrop-blur-sm shadow-xl active:scale-90`}
                                                >
                                                    <FastForward size={24} color="white" fill="white" />
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {/* Seek Bar */}
                                        {showControls && (
                                            <View style={tw`w-full gap-1 p-2 bg-black/20 rounded-2xl`} pointerEvents="box-none">
                                                <View style={tw`flex-row justify-between px-1`} pointerEvents="none">
                                                    <Text style={tw`text-white text-[10px] font-mono font-bold`}>
                                                        {formatTime(isSeeking ? seekValue : status.positionMillis)}
                                                    </Text>
                                                    <Text style={tw`text-white/70 text-[10px] font-mono font-bold`}>
                                                        {formatTime(status.durationMillis)}
                                                    </Text>
                                                </View>

                                                <Slider
                                                    style={{ width: '100%', height: 24 }}
                                                    minimumValue={0}
                                                    maximumValue={status.durationMillis || 1}
                                                    value={seekValue}
                                                    onValueChange={onSeek}
                                                    onSlidingStart={() => {
                                                        onSlidingStart();
                                                        if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
                                                    }}
                                                    onSlidingComplete={(val) => {
                                                        onSlidingComplete(val);
                                                        resetControlsTimer();
                                                    }}
                                                    minimumTrackTintColor="#FACC15"
                                                    maximumTrackTintColor="rgba(255,255,255,0.3)"
                                                    thumbTintColor="#FACC15"
                                                />
                                            </View>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Bottom Actions */}
                        <View style={tw`w-full items-center h-20 justify-center`}>
                            <TouchableOpacity
                                onPress={handleFinish}
                                disabled={!showSkip && !status.didJustFinish}
                                style={[
                                    tw`w-full max-w-[85%] py-4 rounded-2xl items-center shadow-md`,
                                    status.didJustFinish
                                        ? tw`bg-[#FACC15]`
                                        : (showSkip ? tw`bg-gray-100 border border-gray-200` : tw`bg-gray-50 border border-gray-100 opacity-60`)
                                ]}
                            >
                                <Text style={[
                                    tw`font-black text-lg tracking-wide`,
                                    status.didJustFinish ? tw`text-black` : tw`text-gray-400`
                                ]}>
                                    {status.didJustFinish
                                        ? "GET STARTED"
                                        : (!videoLoaded ? "Preparing tour..." : (showSkip ? "Skip Intro" : `Skip in ${countDown}s`))}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </SafeAreaView >
    );

};

// Helper: Format milliseconds to MM:SS
const formatTime = (millis) => {
    if (!millis) return "0:00";
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
};
