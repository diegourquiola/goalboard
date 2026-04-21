import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

import LeaguesTab          from './src/screens/LeaguesTab';
import TeamsTab            from './src/screens/TeamsTab';
import MatchDetailScreen   from './src/screens/MatchDetailScreen';
import TeamDetailScreen    from './src/screens/TeamDetailScreen';
import TeamFixturesScreen  from './src/screens/TeamFixturesScreen';
import PlayerDetailScreen  from './src/screens/PlayerDetailScreen';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { isDark, colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Leagues: focused ? 'trophy'  : 'trophy-outline',
            Teams:   focused ? 'people'  : 'people-outline',
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
          tabPress: () => {
            navigation.navigate('Leagues', { screen: 'LeaguesList' });
          },
        })}
      />
      <Tab.Screen
        name="Teams"
        component={TeamsTab}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('Teams', { screen: 'TeamsList' });
          },
        })}
      />
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
            headerTitleStyle: { fontWeight: '800', fontSize: 16 }
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
            headerTitleStyle: { fontWeight: '800', fontSize: 16 }
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

const styles = StyleSheet.create({});
