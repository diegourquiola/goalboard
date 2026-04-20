import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

import LeaguesTab        from './src/screens/LeaguesTab';
import TeamsScreen       from './src/screens/TeamsScreen';
import MatchDetailScreen from './src/screens/MatchDetailScreen';
import TeamDetailScreen  from './src/screens/TeamDetailScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const logo  = require('./assets/logo.png');

function MainTabs() {
  const { isDark, colors, toggle } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: colors.background,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          elevation: 0,
          shadowOpacity: 0,
          height: 120,
        },
        headerTitleAlign: 'left',
        headerTitle: route.name === 'Teams' ? () => (
          <View style={styles.appHeader}>
            <Image source={logo} style={styles.appLogo} resizeMode="contain" />
            <Text style={[styles.appName, { color: colors.foreground }]}>GoalBoard</Text>
          </View>
        ) : undefined,
        headerRight: route.name === 'Teams' ? () => (
          <TouchableOpacity
            onPress={toggle}
            style={[styles.iconBtn, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            }]}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={colors.foreground} />
          </TouchableOpacity>
        ) : undefined,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Leagues: focused ? 'trophy'  : 'trophy-outline',
            Teams:   focused ? 'people'  : 'people-outline',
          };
          return (
            <View style={styles.tabIconContainer}>
              <Ionicons name={icons[route.name]} size={size} color={color} />
              {focused && (
                <View style={[styles.activeIndicator, { backgroundColor: colors.accent }]} />
              )}
            </View>
          );
        },
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle:  { fontSize: 10, fontWeight: '600', marginBottom: 5 },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor:  colors.border,
          height: 64,
          paddingBottom: 8,
        },
      })}
    >
      <Tab.Screen name="Leagues" component={LeaguesTab} />
      <Tab.Screen name="Teams"   component={TeamsScreen} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { isDark, colors } = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: isDark,
        colors: {
          primary:      colors.accent,
          background:   colors.background,
          card:         colors.card,
          text:         colors.foreground,
          border:       colors.border,
          notification: colors.accent,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium:  { fontFamily: 'System', fontWeight: '500' },
          bold:    { fontFamily: 'System', fontWeight: '700' },
          heavy:   { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs"    component={MainTabs} />
        <Stack.Screen
          name="MatchDetail"
          component={MatchDetailScreen}
          options={{
            headerShown: true,
            title: 'Match',
            headerStyle:      { backgroundColor: colors.background },
            headerTintColor:  colors.foreground,
            headerTitleStyle: { fontWeight: '800', fontSize: 16 },
          }}
        />
        <Stack.Screen
          name="TeamDetail"
          component={TeamDetailScreen}
          options={{
            headerShown: true,
            title: 'Team',
            headerStyle:      { backgroundColor: colors.background },
            headerTintColor:  colors.foreground,
            headerTitleStyle: { fontWeight: '800', fontSize: 16 },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  appHeader:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appLogo:          { width: 32, height: 32, borderRadius: 8 },
  appName:          { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  iconBtn:          { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 20 },
  tabIconContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  activeIndicator:  { position: 'absolute', bottom: -12, width: 4, height: 4, borderRadius: 2 },
});
