import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import TeamsScreen from './TeamsScreen';

const Stack = createNativeStackNavigator();
const logo  = require('../../assets/logo.png');

function AppHeaderTitle({ colors }) {
  return (
    <View style={styles.appHeader}>
      <Image source={logo} style={styles.appLogo} resizeMode="contain" />
      <Text style={[styles.appName, { color: colors.foreground }]}>GoalBoard</Text>
    </View>
  );
}

export default function TeamsTab() {
  const { colors, isDark, toggle } = useTheme();

  function ThemeToggle() {
    return (
      <TouchableOpacity
        onPress={toggle}
        style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
      >
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.foreground} />
      </TouchableOpacity>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        headerTintColor: colors.foreground,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="TeamsList"
        component={TeamsScreen}
        options={{
          headerTitle: () => <AppHeaderTitle colors={colors} />,
          headerTitleAlign: 'left',
          headerLeft: () => null,
          headerRight: () => <ThemeToggle />,
        }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  appHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appLogo:   { width: 32, height: 32, borderRadius: 8 },
  appName:   { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  iconBtn:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
});
