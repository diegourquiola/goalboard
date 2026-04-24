import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';

import LeaguesTab          from './src/screens/LeaguesTab';
import TeamsTab            from './src/screens/TeamsTab';
import FavoritesScreen     from './src/screens/FavoritesScreen';
import MatchDetailScreen   from './src/screens/MatchDetailScreen';
import TeamDetailScreen    from './src/screens/TeamDetailScreen';
import TeamFixturesScreen  from './src/screens/TeamFixturesScreen';
import PlayerDetailScreen  from './src/screens/PlayerDetailScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { useAuth } from './src/context/AuthContext';
import { useBiometrics } from './src/hooks/useBiometrics';

const Tab       = createBottomTabNavigator();
const Stack     = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

function MainTabs() {
  const { isDark, colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Leagues:   focused ? 'trophy'       : 'trophy-outline',
            Teams:     focused ? 'people'       : 'people-outline',
            Favorites: focused ? 'heart'        : 'heart-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle:  { fontSize: 10, fontWeight: '600', marginBottom: 5 },
        tabBarBackground: () => (
          <BlurView
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            intensity={80}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          borderTopColor:  colors.border,
          height: 64,
          paddingBottom: 8,
        },
      })}
    >
      <Tab.Screen
        name="Leagues"
        component={LeaguesTab}
        listeners={({ navigation }) => ({
          tabPress: () => navigation.navigate('Leagues', { screen: 'LeaguesList' }),
        })}
      />
      <Tab.Screen
        name="Teams"
        component={TeamsTab}
        listeners={({ navigation }) => ({
          tabPress: () => navigation.navigate('Teams', { screen: 'TeamsList' }),
        })}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  const { colors } = useTheme();
  // Lazy-loaded to avoid circular issues before auth screens exist
  const LoginScreen  = require('./src/screens/auth/LoginScreen').default;
  const SignupScreen = require('./src/screens/auth/SignupScreen').default;

  return (
    <AuthStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.foreground,
      headerShadowVisible: false,
    }}>
      <AuthStack.Screen name="Login"  component={LoginScreen}  options={{ headerShown: false }} />
      <AuthStack.Screen name="Signup" component={SignupScreen} options={{ title: 'Create Account' }} />
    </AuthStack.Navigator>
  );
}

function AppContent() {
  const { session, loading } = useAuth();
  const { isDark, colors } = useTheme();
  const { enabled: biometricsEnabled, authenticate } = useBiometrics();
  const [locked, setLocked] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (session && biometricsEnabled) {
        setLocked(true);
        authenticate().then(success => {
          if (success) setLocked(false);
          setBiometricChecked(true);
        });
      } else {
        setBiometricChecked(true);
      }
    }
  }, [loading]);

  if (loading || !biometricChecked) return null;

  if (locked) {
    return (
      <View style={[styles.lockScreen, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => authenticate().then(s => { if (s) setLocked(false); })}>
          <Text style={[styles.unlockText, { color: colors.accent }]}>Tap to unlock with Face ID</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
      <Stack.Navigator screenOptions={{ headerShown: false, headerBackTitle: 'Back' }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
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
        <Stack.Screen
          name="TeamFixtures"
          component={TeamFixturesScreen}
          options={({ route }) => ({
            headerShown: true,
            title: route.params?.teamName ?? 'Fixtures',
            headerStyle:      { backgroundColor: colors.background },
            headerTintColor:  colors.foreground,
            headerTitleStyle: { fontWeight: '800', fontSize: 16 },
          })}
        />
        <Stack.Screen
          name="PlayerDetail"
          component={PlayerDetailScreen}
          options={{
            headerShown: true,
            title: 'Player',
            headerStyle:      { backgroundColor: colors.background },
            headerTintColor:  colors.foreground,
            headerTitleStyle: { fontWeight: '800', fontSize: 16 },
          }}
        />
        <Stack.Screen
          name="Profile"
          component={require('./src/screens/ProfileScreen').default}
          options={{
            headerShown: true,
            title: 'Profile',
            headerStyle:      { backgroundColor: colors.background },
            headerTintColor:  colors.foreground,
            headerTitleStyle: { fontWeight: '800', fontSize: 16 },
          }}
        />
        <Stack.Screen name="Auth" component={AuthNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  lockScreen:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  unlockText:  { fontSize: 16, fontWeight: '600' },
});
