import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }) => {
    return (
        <View className="absolute bottom-6 left-4 right-4 bg-white/90 rounded-2xl flex-row h-16 shadow-lg items-center px-2"
            style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 5
            }}
        >
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                            ? options.title
                            : route.name;

                const isFocused = state.index === index;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <TouchableOpacity
                        key={index}
                        onPress={onPress}
                        className={`flex-1 items-center justify-center h-full ${isFocused ? '' : ''}`}
                    >
                        {/* 
                           Icon Logic would go here. For now using Text/Unicode as placeholder if no icons available.
                           Ideally, we pass icons via options.
                        */}
                        <Text className={`text-2xl ${isFocused ? 'text-yellow-500' : 'text-gray-400'}`}>
                            {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused }) : '•'}
                        </Text>

                        {isFocused && (
                            <Text className="text-[10px] font-bold text-yellow-600 mt-1 capitalize">
                                {label}
                            </Text>
                        )}

                        {/* Active Indicator Dot */}
                        {isFocused && (
                            <View className="absolute -bottom-1 w-1 h-1 bg-yellow-500 rounded-full" />
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
