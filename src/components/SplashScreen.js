import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withDelay,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export const SplashScreen = ({ onAnimationComplete }) => {
    const dabbaIcon = require('../../assets/Onlydabba.png');

    // Animation values
    const dabbaScale = useSharedValue(0);
    const dabbaOpacity = useSharedValue(0);

    // Letter animations for "DabbaMe"
    const letters = ['D', 'a', 'b', 'b', 'a', 'M', 'e'];
    const letterOpacities = letters.map(() => useSharedValue(0));
    const letterTranslateY = letters.map(() => useSharedValue(10));

    // Smile underline animation
    const smileScale = useSharedValue(0);
    const smileOpacity = useSharedValue(0);

    // Container exit
    const containerOpacity = useSharedValue(1);

    useEffect(() => {
        // Dabba icon popup (0-700ms)
        dabbaOpacity.value = withDelay(
            100,
            withTiming(1, {
                duration: 400,
                easing: Easing.out(Easing.ease),
            })
        );

        dabbaScale.value = withDelay(
            100,
            withSpring(1, {
                damping: 10,
                stiffness: 120,
                mass: 0.8,
            })
        );

        // Letter-by-letter animation (700-1500ms)
        letters.forEach((_, index) => {
            const delay = 700 + (index * 80); // 80ms between each letter

            letterOpacities[index].value = withDelay(
                delay,
                withTiming(1, {
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                })
            );

            letterTranslateY[index].value = withDelay(
                delay,
                withSpring(0, {
                    damping: 8,
                    stiffness: 100,
                })
            );
        });

        // Smile underline animation (1600-2000ms)
        smileOpacity.value = withDelay(
            1600,
            withTiming(1, {
                duration: 300,
                easing: Easing.out(Easing.ease),
            })
        );

        smileScale.value = withDelay(
            1600,
            withSpring(1, {
                damping: 8,
                stiffness: 100,
            })
        );

        // Exit animation (2400-2800ms)
        containerOpacity.value = withDelay(
            2400,
            withTiming(0, {
                duration: 400,
                easing: Easing.in(Easing.ease),
            }, (finished) => {
                if (finished) {
                    runOnJS(onAnimationComplete)();
                }
            })
        );
    }, []);

    // Animated styles
    const dabbaStyle = useAnimatedStyle(() => ({
        opacity: dabbaOpacity.value,
        transform: [{ scale: dabbaScale.value }],
    }));

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
    }));

    const smileStyle = useAnimatedStyle(() => ({
        opacity: smileOpacity.value,
        transform: [{ scaleX: smileScale.value }],
    }));

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            {/* Dabba Icon */}
            <Animated.View style={dabbaStyle}>
                <Image source={dabbaIcon} style={styles.dabbaIcon} resizeMode="contain" />
            </Animated.View>

            {/* DabbaMe Text - Letter by Letter */}
            <View style={styles.textContainer}>
                {letters.map((letter, index) => {
                    const letterStyle = useAnimatedStyle(() => ({
                        opacity: letterOpacities[index].value,
                        transform: [{ translateY: letterTranslateY[index].value }],
                    }));

                    return (
                        <Animated.Text
                            key={index}
                            style={[
                                styles.letter,
                                (index === 5 || index === 6) ? styles.letterDark : null, // "Me" is darker
                                letterStyle
                            ]}
                        >
                            {letter}
                        </Animated.Text>
                    );
                })}
            </View>

            {/* Smile Underline */}
            <Animated.View style={[styles.smileContainer, smileStyle]}>
                <Svg width={120} height={20} viewBox="0 0 120 20">
                    <Path
                        d="M 10 5 Q 60 15, 110 5"
                        stroke="#D4A024"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                    />
                </Svg>
            </Animated.View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dabbaIcon: {
        width: width * 0.35,
        height: width * 0.35,
        marginBottom: 20,
    },
    textContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    letter: {
        fontSize: 42,
        fontWeight: '700',
        color: '#D4A024', // Golden color from logo
        letterSpacing: 1,
    },
    letterDark: {
        color: '#4A4A4A', // Darker color for "Me"
    },
    smileContainer: {
        marginTop: 5,
        alignItems: 'center',
    },
});
