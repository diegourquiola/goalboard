import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import LeaguesListScreen from './LeaguesListScreen';
import LeagueDetailScreen from './LeagueDetailScreen';

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
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Profile')}
      style={[styles.iconBtn, { backgroundColor: 'rgba(128,128,128,0.1)' }]}
    >
      <Ionicons name="person-circle-outline" size={24} color={colors.foreground} />
    </TouchableOpacity>
  );
}

export default function LeaguesTab() {
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
        name="LeaguesList"
        component={LeaguesListScreen}
        options={({ navigation }) => ({
          headerTitle: () => <AppHeaderTitle colors={colors} />,
          headerTitleAlign: 'left',
          headerLeft: () => null,
          headerRight: () => <ProfileIcon navigation={navigation} colors={colors} />,
        })}
      />
      <Stack.Screen
        name="LeagueDetail"
        component={LeagueDetailScreen}
        options={({ route, navigation }) => ({
          headerTitle: () => (
            route.params?.league?.logo
              ? <Image source={{ uri: route.params.league.logo }} style={styles.leagueLogo} resizeMode="contain" />
              : null
          ),
          headerRight: () => <ProfileIcon navigation={navigation} colors={colors} />,
        })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  appHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appLogo:    { width: 32, height: 32, borderRadius: 8 },
  appName:    { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  leagueLogo: { width: 36, height: 36 },
  iconBtn:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
});
