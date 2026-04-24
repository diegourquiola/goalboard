import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useAuth } from '../context/AuthContext';
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

function ProfileIcon({ navigation, colors }) {
  const { session } = useAuth();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate(session ? 'Profile' : 'Auth')}
      style={[styles.iconBtn, { backgroundColor: 'rgba(128,128,128,0.1)' }]}
    >
      <Ionicons name="person-circle-outline" size={24} color={colors.foreground} />
    </TouchableOpacity>
  );
}

export default function TeamsTab() {
  const { colors } = useTheme();

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
        options={({ navigation }) => ({
          headerTitle: () => <AppHeaderTitle colors={colors} />,
          headerTitleAlign: 'left',
          headerLeft: () => null,
          headerRight: () => <ProfileIcon navigation={navigation} colors={colors} />,
        })}
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
